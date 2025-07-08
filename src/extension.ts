import * as vscode from "vscode";
import { BackupManager } from "./backupManager";
import { StatusBarManager } from "./statusBarManager";

let backupManager: BackupManager;
let statusBarManager: StatusBarManager;

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("File Backup Extension is now active!");

  // Initialize managers
  backupManager = new BackupManager();
  statusBarManager = new StatusBarManager(backupManager);

  // Register backup command
  const backupCommand = vscode.commands.registerCommand(
    "fileBackup.backupCurrentFile",
    () => backupManager.backupCurrentFile()
  );

  // Register cleanup command
  const cleanupCommand = vscode.commands.registerCommand(
    "fileBackup.cleanupOldBackups",
    () => backupManager.cleanupOldBackups()
  );

  // Register auto-backup on save
  const onSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
    const config = vscode.workspace.getConfiguration("fileBackup");
    if (config.get("autoBackupOnSave")) {
      backupManager.backupFile(document);
    }
  });

  // Add to subscriptions for proper cleanup
  context.subscriptions.push(
    backupCommand,
    cleanupCommand,
    onSaveListener,
    statusBarManager
  );
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
