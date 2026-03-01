import * as vscode from 'vscode';
import { UniversalConverter } from '../services/universalConverter';
import type { StatusBarService } from '../services/statusBarService';

/**
 * Registers all KeyFlip commands and maps them to UniversalConverter methods.
 *
 * Three separate convert commands are used — one per focus context — so that
 * VS Code's keybinding `when` clause can route `Ctrl+Alt+L` to the right
 * handler before the extension host is even involved:
 *
 *   keyflip.convert          → editorTextFocus  → TextEditor API (in-place)
 *   keyflip.convertTerminal  → terminalFocus     → terminal.selection + paste
 *   keyflip.convertClipboard → everything else   → clipboard bridge
 *   keyflip.toggle           → (no focus guard)  → status-bar toggle
 */
export class ConvertLayoutCommand implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly universal: UniversalConverter;

  public constructor(private readonly statusBar: StatusBarService) {
    // UniversalConverter is stateless — a single shared instance is fine.
    this.universal = new UniversalConverter();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Call once from extension.activate(). */
  public register(): void {
    this.disposables.push(
      // ── Editor: uses VS Code TextEditor API for in-place replacement ──────
      // `registerCommand` (not registerTextEditorCommand) lets us keep the
      // handler async while still receiving the active editor as argument.
      vscode.commands.registerCommand(
        'keyflip.convert',
        this.handleEditorConvert,
        this,
      ),

      // ── Terminal: reads terminal.selection, converts, pastes back ─────────
      vscode.commands.registerCommand(
        'keyflip.convertTerminal',
        this.handleTerminalConvert,
        this,
      ),

      // ── WebView / clipboard: clipboard-sentinel bridge ────────────────────
      vscode.commands.registerCommand(
        'keyflip.convertClipboard',
        this.handleClipboardConvert,
        this,
      ),

      // ── Toggle ────────────────────────────────────────────────────────────
      vscode.commands.registerCommand(
        'keyflip.toggle',
        this.handleToggle,
        this,
      ),
    );
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  // ── Command handlers ──────────────────────────────────────────────────────

  /**
   * Editor handler: converts selected text (or word/line at cursor).
   * Triggered when `editorTextFocus` is true.
   */
  private async handleEditorConvert(): Promise<void> {
    if (!this.guardEnabled()) {
      return;
    }

    // Grab the active editor at call time (safe because editorTextFocus is set).
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    await this.universal.convertEditor(editor);
  }

  /**
   * Terminal handler: converts the terminal's current selection.
   * Triggered when `terminalFocus` is true.
   */
  private async handleTerminalConvert(): Promise<void> {
    if (!this.guardEnabled()) {
      return;
    }

    const terminal = vscode.window.activeTerminal;
    if (!terminal) {
      void vscode.window.showWarningMessage(
        'KeyFlip: No active terminal found.',
      );
      return;
    }

    await this.universal.convertTerminal(terminal);
  }

  /**
   * WebView / clipboard handler: clipboard-sentinel approach.
   * Triggered when neither `editorTextFocus` nor `terminalFocus` is true.
   */
  private async handleClipboardConvert(): Promise<void> {
    if (!this.guardEnabled()) {
      return;
    }

    await this.universal.convertClipboard();
  }

  /** Toggles the enabled/disabled state and updates the status bar. */
  private handleToggle(): void {
    this.statusBar.toggle();
    const state = this.statusBar.isEnabled ? 'ON' : 'OFF';
    void vscode.window.showInformationMessage(`KeyFlip is now ${state}.`);
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  /**
   * Returns false (and shows a message) when KeyFlip is toggled OFF.
   * Prevents accidental conversions when the user has disabled the feature.
   */
  private guardEnabled(): boolean {
    if (!this.statusBar.isEnabled) {
      void vscode.window.showInformationMessage(
        'KeyFlip is OFF — click the status bar item or run "KeyFlip: Toggle On/Off".',
      );
      return false;
    }
    return true;
  }
}
