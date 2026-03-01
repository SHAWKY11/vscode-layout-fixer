import * as vscode from 'vscode';
import { containsArabic } from '../utils/detectionUtils';
import { convertLanguage } from '../utils/converterApi';
import type { DocumentProtector } from './documentProtector';

/**
 * Handles the `keyflip.autoFixOnSave` feature.
 *
 * When enabled, hooks into `onWillSaveTextDocument` and converts Arabic
 * layout text found outside protected regions (strings, comments, Blade
 * directives) before the file is written to disk.
 *
 * Strategy
 * ─────────
 * 1. Skip empty / Arabic-free lines early (fast path).
 * 2. Split each affected line into protected / unprotected segments.
 * 3. Inside unprotected segments, find contiguous Arabic runs (regex).
 * 4. Convert all runs in parallel via `convertLanguage()`.
 * 5. Return TextEdits — VS Code applies them atomically before saving.
 *
 * Conversion function
 * ────────────────────
 * Uses `convertLanguage` from `converterApi.ts`.
 * Swap that function's body to plug in a translation API or any other
 * text transformation without touching this file.
 */
export class AutoFixService implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  public constructor(private readonly protector: DocumentProtector) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Registers the onWillSave listener. Call once from extension.activate(). */
  public register(): void {
    this.disposables.push(
      vscode.workspace.onWillSaveTextDocument(this.handleWillSave, this),
    );
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  // ── Event handler ─────────────────────────────────────────────────────────

  private handleWillSave(event: vscode.TextDocumentWillSaveEvent): void {
    if (!this.isAutoFixEnabled()) {
      return;
    }

    // `waitUntil` accepts a Promise<TextEdit[]>; VS Code applies them before
    // writing the file.  Any thrown errors are surfaced as save failures.
    event.waitUntil(this.buildEdits(event.document));
  }

  // ── Edit builder ──────────────────────────────────────────────────────────

  /**
   * Scans the entire document and returns TextEdits for every Arabic run
   * found outside a protected region.
   *
   * Arabic runs on different lines are converted concurrently.
   */
  private async buildEdits(
    document: vscode.TextDocument,
  ): Promise<vscode.TextEdit[]> {
    // Collect all (runText, range) pairs from every affected line.
    interface Run {
      range: vscode.Range;
      text: string;
    }

    const runs: Run[] = [];

    for (let lineIdx = 0; lineIdx < document.lineCount; lineIdx++) {
      const line = document.lineAt(lineIdx);

      // Fast-path: skip empty and Arabic-free lines.
      if (line.isEmptyOrWhitespace || !containsArabic(line.text)) {
        continue;
      }

      this.collectArabicRuns(document, line, runs);
    }

    if (runs.length === 0) {
      return [];
    }

    // Convert all runs in parallel (one await for the whole document).
    const converted = await Promise.all(
      runs.map((r) => convertLanguage(r.text)),
    );

    // Build TextEdits, skipping runs where nothing changed.
    const edits: vscode.TextEdit[] = [];
    runs.forEach((run, i) => {
      if (converted[i] !== run.text) {
        edits.push(vscode.TextEdit.replace(run.range, converted[i]));
      }
    });

    return edits;
  }

  /**
   * Finds contiguous Arabic character runs in unprotected segments of one
   * line and pushes them into `out`.
   */
  private collectArabicRuns(
    document: vscode.TextDocument,
    line: vscode.TextLine,
    out: Array<{ range: vscode.Range; text: string }>,
  ): void {
    const segments = this.protector.getSegments(line.text, document.languageId);
    const arabicRunRe = /[\u0600-\u06FF]+/g;

    for (const segment of segments) {
      if (segment.isProtected || !containsArabic(segment.text)) {
        continue;
      }

      // Reset lastIndex before reuse across segments.
      arabicRunRe.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = arabicRunRe.exec(segment.text)) !== null) {
        const runStart = segment.offset + match.index;

        out.push({
          text: match[0],
          range: new vscode.Range(
            line.lineNumber,
            runStart,
            line.lineNumber,
            runStart + match[0].length,
          ),
        });
      }
    }
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  private isAutoFixEnabled(): boolean {
    return vscode.workspace
      .getConfiguration('keyflip')
      .get<boolean>('autoFixOnSave', false);
  }
}
