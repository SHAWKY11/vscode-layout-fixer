import * as vscode from 'vscode';
import { convertLanguage } from '../utils/converterApi';

/**
 * How long to wait (ms) after issuing a "copy" command before reading the
 * clipboard. The clipboard write from VS Code is async; without this pause
 * we may read the old value.
 */
const CLIPBOARD_SETTLE_MS = 150;

/**
 * Converts selected text across all three VS Code focus contexts.
 *
 * ┌──────────────────┬────────────────────────────────────────────────────────┐
 * │ Context          │ Strategy                                               │
 * ├──────────────────┼────────────────────────────────────────────────────────┤
 * │ Text editor      │ TextEditor API → async convert → atomic in-place edit  │
 * │ Integrated term. │ terminal.selection (1.79+) → convert → clipboard+paste │
 * │ WebView / other  │ Clipboard sentinel → auto-copy → convert → paste       │
 * └──────────────────┴────────────────────────────────────────────────────────┘
 *
 * Why three separate public methods instead of auto-detect?
 *   VS Code routes commands to the right method via `when` clause keybindings,
 *   which is evaluated before our code runs.  This is more reliable than
 *   inspecting focus at runtime and avoids a round-trip to the extension host.
 */
export class UniversalConverter {
  // ── 1. Text editor ────────────────────────────────────────────────────────

  /**
   * Converts all selections (or word/line at cursor) in the active text editor.
   *
   * Because `convertLanguage()` is async but `editor.edit()` requires a sync
   * callback, we gather all text ranges first, convert in parallel, then apply
   * all edits in a single atomic operation.
   *
   * @param editor - The currently active VS Code text editor.
   */
  public async convertEditor(editor: vscode.TextEditor): Promise<void> {
    const { document, selections } = editor;

    // ── Step 1: collect every (range, text) pair we need to convert ────────
    interface Task {
      range: vscode.Range;
      original: string;
    }

    const tasks: Task[] = [];

    for (const sel of selections) {
      if (!sel.isEmpty) {
        // User made an explicit selection — use it directly.
        tasks.push({ range: sel, original: document.getText(sel) });
        continue;
      }

      // No selection: convert the non-whitespace token under the cursor.
      const wordRange = document.getWordRangeAtPosition(sel.active, /\S+/);
      if (wordRange) {
        tasks.push({
          range: wordRange,
          original: document.getText(wordRange),
        });
        continue;
      }

      // No token at cursor: fall back to the entire line.
      const line = document.lineAt(sel.active.line);
      if (!line.isEmptyOrWhitespace) {
        tasks.push({ range: line.range, original: line.text });
      }
    }

    if (tasks.length === 0) {
      return;
    }

    // ── Step 2: convert all texts (parallel, async) ────────────────────────
    const converted = await Promise.all(
      tasks.map((t) => convertLanguage(t.original)),
    );

    // ── Step 3: apply as one atomic edit (sync callback required by VS Code) ─
    await editor.edit((builder) => {
      tasks.forEach((task, i) => {
        // Only emit an edit when the text actually changed.
        if (converted[i] !== task.original) {
          builder.replace(task.range, converted[i]);
        }
      });
    });
  }

  // ── 2. Integrated terminal ────────────────────────────────────────────────

  /**
   * Converts selected text in the active integrated terminal.
   *
   * Reading the selection:
   *   VS Code 1.79+ exposes `terminal.selection` (readonly string).
   *   On older versions we fall back to the clipboard-sentinel approach.
   *
   * Writing back:
   *   Terminals are stream-based, not document-based.  The only write API is
   *   `terminal.paste`, which inserts at the current cursor position.
   *   Users may need to manually clear the original wrong text first
   *   (e.g. Ctrl+U in bash to kill the current line, then Ctrl+Shift+V).
   *
   * @param terminal - The currently active VS Code terminal.
   */
  public async convertTerminal(terminal: vscode.Terminal): Promise<void> {
    // Try the direct API first (VS Code 1.79+).
    // The type definition may not include `.selection` on older @types/vscode,
    // so we cast with a widened type to avoid compile errors.
    const directSelection = (
      terminal as vscode.Terminal & { readonly selection?: string }
    ).selection;

    let source: string | undefined;

    if (directSelection?.trim()) {
      source = directSelection;
    } else {
      // Clipboard sentinel: write a unique token, trigger copy, read back.
      // If the clipboard still contains our token → nothing was selected.
      source = await this.readSelectionViaClipboard(
        'workbench.action.terminal.copySelection',
      );
    }

    if (!source) {
      void vscode.window.showInformationMessage(
        'KeyFlip: No text selected in the terminal. ' +
          'Select text first, then press the shortcut.',
      );
      return;
    }

    const result = await convertLanguage(source);

    if (result === source) {
      return; // Nothing changed — don't pollute the clipboard.
    }

    // Write converted text to clipboard, then paste into terminal.
    await vscode.env.clipboard.writeText(result);
    await vscode.commands.executeCommand('workbench.action.terminal.paste');

    // Status-bar hint in case auto-paste lands at the wrong position.
    vscode.window.setStatusBarMessage(
      `$(check) KeyFlip: "${source}" → "${result}" — use Ctrl+Shift+V if not pasted correctly`,
      6000,
    );
  }

  // ── 3. WebView / clipboard fallback ──────────────────────────────────────

  /**
   * Converts selected text in a WebView panel (Gemini, Claude Code, GitHub
   * Copilot Chat, etc.) or any other non-editor, non-terminal context.
   *
   * Why clipboard?
   *   VS Code extensions cannot read the DOM or inject text into third-party
   *   WebViews.  The system clipboard is the only shared channel available
   *   between the extension host and those sandboxed renderers.
   *
   * Flow:
   *   1. Place a random sentinel token in the clipboard.
   *   2. Fire `editor.action.clipboardCopyAction` — works in some panels.
   *   3. Wait for the clipboard to settle.
   *   4a. If the clipboard changed → new text was auto-copied → convert → paste.
   *   4b. If unchanged (sentinel still present) → try converting whatever was
   *       already in the clipboard before we started (user may have pressed
   *       Ctrl+C manually before triggering the shortcut).
   *   5. Show a status-bar hint; the user presses Ctrl+V to complete the paste
   *      in contexts where auto-paste is not possible.
   */
  public async convertClipboard(): Promise<void> {
    // Snapshot clipboard so we can restore it if nothing happens.
    const prevClipboard = await vscode.env.clipboard.readText();

    // Attempt auto-copy from whatever UI element currently has focus.
    const autoCopied = await this.readSelectionViaClipboard(
      'editor.action.clipboardCopyAction',
    );

    if (autoCopied) {
      // ── Happy path: auto-copy succeeded ───────────────────────────────
      const result = await convertLanguage(autoCopied);

      if (result === autoCopied) {
        // No conversion happened — restore original clipboard content.
        await vscode.env.clipboard.writeText(prevClipboard);
        return;
      }

      await vscode.env.clipboard.writeText(result);

      // Attempt auto-paste (succeeds in some panel/webview contexts).
      await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

      vscode.window.setStatusBarMessage(
        '$(check) KeyFlip: converted — press Ctrl+V (⌘V) if not auto-pasted',
        5000,
      );
      return;
    }

    // ── Fallback: use whatever was already in the clipboard ─────────────
    // Handles the case where the user pressed Ctrl+C manually before the
    // shortcut (e.g. because the WebView captures keyboard events).
    if (!prevClipboard.trim()) {
      void vscode.window.showInformationMessage(
        'KeyFlip: Select text in the WebView, then press the shortcut. ' +
          'If the shortcut is captured by the panel, copy the text with Ctrl+C first.',
      );
      return;
    }

    const result = await convertLanguage(prevClipboard);

    if (result === prevClipboard) {
      return;
    }

    await vscode.env.clipboard.writeText(result);

    void vscode.window.showInformationMessage(
      'KeyFlip: Clipboard converted. Press Ctrl+V (⌘V) to paste.',
    );
  }

  // ── Shared clipboard helper ───────────────────────────────────────────────

  /**
   * Places a random sentinel in the clipboard, executes `copyCommand`, waits
   * for the clipboard to settle, then returns whatever was placed there.
   *
   * Returns `undefined` when the clipboard still holds the sentinel —
   * meaning the copy command did not find any selected text.
   */
  private async readSelectionViaClipboard(
    copyCommand: string,
  ): Promise<string | undefined> {
    // Use a unique token so we can detect "nothing was copied".
    const sentinel = `__kf_${Math.random().toString(36).slice(2)}__`;
    await vscode.env.clipboard.writeText(sentinel);

    await vscode.commands.executeCommand(copyCommand);

    // Give the clipboard write time to propagate.
    await new Promise<void>((resolve) =>
      setTimeout(resolve, CLIPBOARD_SETTLE_MS),
    );

    const result = await vscode.env.clipboard.readText();

    // Treat "unchanged" or "empty" as "nothing selected".
    return result !== sentinel && result.trim() ? result : undefined;
  }
}
