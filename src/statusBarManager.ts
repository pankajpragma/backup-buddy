import * as vscode from "vscode";
import { BackupManager } from "./backupManager";

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private cleanupStatusBarItem: vscode.StatusBarItem;

  constructor(private backupManager: BackupManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.cleanupStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );

    this.setupStatusBarItems();
    this.statusBarItem.show();
    this.cleanupStatusBarItem.show();
  }

  /**
   * Setup the status bar items with icons, tooltips, and commands
   */
  private setupStatusBarItems(): void {
    // Backup button
    this.statusBarItem.text = "💾";
    this.statusBarItem.tooltip = "Backup Current File";
    this.statusBarItem.command = "fileBackup.backupCurrentFile";
    this.statusBarItem.backgroundColor = undefined;

    // Cleanup button
    this.cleanupStatusBarItem.text = "🧹";
    this.cleanupStatusBarItem.tooltip = "Clean Up Old Backup Files";
    this.cleanupStatusBarItem.command = "fileBackup.cleanupOldBackups";
    this.cleanupStatusBarItem.backgroundColor = undefined;
  }

  /**
   * Update the status bar items appearance based on context
   */
  public updateStatus(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && !activeEditor.document.isUntitled) {
      this.statusBarItem.text = "💾";
      this.statusBarItem.tooltip = `Backup Current File: ${activeEditor.document.fileName}`;
      this.statusBarItem.show();
    } else {
      this.statusBarItem.text = "💾";
      this.statusBarItem.tooltip = "No file to backup";
      this.statusBarItem.show();
    }

    // Cleanup button is always available
    this.cleanupStatusBarItem.show();
  }

  /**
   * Dispose of the status bar items
   */
  public dispose(): void {
    this.statusBarItem.dispose();
    this.cleanupStatusBarItem.dispose();
  }
}
