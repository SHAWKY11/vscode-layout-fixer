import * as vscode from 'vscode';

const ICON_ON = '$(symbol-keyword)';
const ICON_OFF = '$(circle-slash)';

/**
 * Manages the KeyFlip status bar item.
 *
 * - Shows current on/off state.
 * - Clicking it runs `keyflip.toggle`.
 * - Respects the `keyflip.enableStatusBar` setting.
 * - Implements Disposable so VS Code cleans it up automatically.
 */
export class StatusBarService implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private enabled: boolean = true;

  public constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = 'keyflip.toggle';
    this.item.tooltip = 'KeyFlip — Click to toggle on/off';
    this.render();
  }

  // ── State accessors ───────────────────────────────────────────────────────

  public get isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): void {
    this.enabled = !this.enabled;
    this.render();
  }

  public enable(): void {
    this.enabled = true;
    this.render();
  }

  public disable(): void {
    this.enabled = false;
    this.render();
  }

  // ── Visibility ────────────────────────────────────────────────────────────

  /**
   * Shows or hides the item according to the `keyflip.enableStatusBar` setting.
   * Call this on activation and whenever the setting changes.
   */
  public syncVisibility(): void {
    const show = vscode.workspace
      .getConfiguration('keyflip')
      .get<boolean>('enableStatusBar', true);

    if (show) {
      this.item.show();
    } else {
      this.item.hide();
    }
  }

  // ── Dispose ───────────────────────────────────────────────────────────────

  public dispose(): void {
    this.item.dispose();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private render(): void {
    if (this.enabled) {
      this.item.text = `${ICON_ON} KeyFlip: ON`;
      this.item.backgroundColor = undefined;
      this.item.color = undefined;
    } else {
      this.item.text = `${ICON_OFF} KeyFlip: OFF`;
      this.item.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground',
      );
    }
  }
}
