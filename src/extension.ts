import * as vscode from 'vscode';
import { ConvertLayoutCommand } from './commands/convertLayoutCommand';
import { AutoFixService } from './services/autoFixService';
import { DocumentProtector } from './services/documentProtector';
import { StatusBarService } from './services/statusBarService';

/**
 * Extension entry point.
 *
 * Dependency graph
 * ─────────────────
 *   DocumentProtector  ──► AutoFixService
 *   StatusBarService   ──► ConvertLayoutCommand ──► UniversalConverter
 *
 * All disposables are registered in context.subscriptions so VS Code
 * releases them automatically on deactivation — no manual cleanup needed.
 */
export function activate(context: vscode.ExtensionContext): void {
  // ── Services ──────────────────────────────────────────────────────────────

  // Identifies protected code regions (strings, comments, Blade directives).
  const protector = new DocumentProtector();

  // Status bar item — shared between commands and toggle.
  const statusBar = new StatusBarService();

  // Auto-fix on save: converts stray Arabic in unprotected code regions.
  // Uses `convertLanguage` from converterApi.ts — swap that function to change
  // what "conversion" means without touching this file.
  const autoFix = new AutoFixService(protector);

  // ── Commands ──────────────────────────────────────────────────────────────

  // Registers keyflip.convert / keyflip.convertTerminal /
  //           keyflip.convertClipboard / keyflip.toggle.
  // Each command delegates to UniversalConverter for the actual work.
  const convertCmd = new ConvertLayoutCommand(statusBar);

  convertCmd.register();
  autoFix.register();

  // ── Status bar ────────────────────────────────────────────────────────────

  statusBar.syncVisibility(); // Respect keyflip.enableStatusBar setting.

  // ── Configuration change listener ─────────────────────────────────────────

  const onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('keyflip.enableStatusBar')) {
      statusBar.syncVisibility();
    }
  });

  // ── Register all disposables ──────────────────────────────────────────────

  context.subscriptions.push(statusBar, autoFix, convertCmd, onConfigChange);
}

/** Called on deactivation; VS Code disposes context.subscriptions automatically. */
export function deactivate(): void {
  // intentionally empty
}
