import * as vscode from "vscode";
import * as path from "path";
import { BackupManager } from "./backupManager";
import { Logger } from "./logger";

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private cleanupStatusBarItem: vscode.StatusBarItem;
  private rollbackStatusBarItem: vscode.StatusBarItem;
  private logger = Logger.getInstance();

  constructor(private backupManager: BackupManager) {
    this.logger.debug("Initializing StatusBarManager");
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    this.cleanupStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );

    this.rollbackStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      98
    );

    this.setupStatusBarItems();
    this.statusBarItem.show();
    this.cleanupStatusBarItem.show();
    this.logger.info("Cleanup status bar item created and shown");
    // Rollback button will be shown/hidden based on backup availability
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

    // Rollback button
    this.rollbackStatusBarItem.text = "🔄";
    this.rollbackStatusBarItem.tooltip = "Rollback to Latest Backup";
    this.rollbackStatusBarItem.command = "fileBackup.rollbackCurrentFile";
    this.rollbackStatusBarItem.backgroundColor = undefined;
  }

  /**
   * Update the status bar items appearance based on context
   */
  public async updateStatus(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && !activeEditor.document.isUntitled) {
      this.statusBarItem.text = "💾";
      this.statusBarItem.tooltip = `Backup Current File: ${activeEditor.document.fileName}`;
      this.statusBarItem.show();
      this.logger.debug(`Status bar updated for file: ${activeEditor.document.fileName}`);
      
      // Check if backup exists for rollback button
      const hasBackup = await this.backupManager.hasBackupForCurrentFile();
      if (hasBackup) {
        this.rollbackStatusBarItem.tooltip = `Rollback to Latest Backup: ${path.basename(activeEditor.document.fileName)}`;
        this.rollbackStatusBarItem.show();
        this.logger.debug(`Rollback button shown for file: ${activeEditor.document.fileName}`);
      } else {
        this.rollbackStatusBarItem.hide();
        this.logger.debug(`Rollback button hidden - no backup for file: ${activeEditor.document.fileName}`);
      }
    } else {
      this.statusBarItem.text = "💾";
      this.statusBarItem.tooltip = "No file to backup";
      this.statusBarItem.show();
      this.rollbackStatusBarItem.hide();
      this.logger.debug("Status bar updated - no active file");
    }

    // Cleanup button is always available
    this.cleanupStatusBarItem.show();
    this.logger.debug("Cleanup status bar item shown in updateStatus");
  }

  /**
   * Dispose of the status bar items
   */
  public dispose(): void {
    this.logger.debug("Disposing StatusBarManager");
    this.statusBarItem.dispose();
    this.cleanupStatusBarItem.dispose();
    this.rollbackStatusBarItem.dispose();
  }
}
