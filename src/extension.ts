import * as vscode from "vscode";
import { BackupManager } from "./backupManager";
import { StatusBarManager } from "./statusBarManager";
import { Logger, LogLevel } from "./logger";
import { ProgressManager } from "./progressManager";

let backupManager: BackupManager;
let statusBarManager: StatusBarManager;

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export async function activate(context: vscode.ExtensionContext) {
  // Initialize logger
  const logger = Logger.getInstance();
  logger.info("File Backup AI Protection extension is activating...");
  
  // Set log level based on development mode
  const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
  logger.setLogLevel(isDevelopment ? LogLevel.DEBUG : LogLevel.INFO);
  
  // Initialize managers
  backupManager = new BackupManager();
  statusBarManager = new StatusBarManager(backupManager);

  // Register commands with error handling
  const backupCommand = vscode.commands.registerCommand(
    "fileBackup.backupCurrentFile",
    async () => {
      try {
        await backupManager.backupCurrentFile();
        await statusBarManager.updateStatus(); // Update status after backup
      } catch (error) {
        logger.error("Failed to execute backup command", error);
      }
    }
  );

  const cleanupCommand = vscode.commands.registerCommand(
    "fileBackup.cleanupOldBackups",
    async () => {
      try {
        await backupManager.cleanupOldBackups();
      } catch (error) {
        logger.error("Failed to execute cleanup command", error);
      }
    }
  );

  const rollbackCommand = vscode.commands.registerCommand(
    "fileBackup.rollbackCurrentFile",
    async () => {
      try {
        await backupManager.rollbackCurrentFile();
        await statusBarManager.updateStatus(); // Update status after rollback
      } catch (error) {
        logger.error("Failed to rollback current file", error);
      }
    }
  );
  
  // Register command to show logs
  const showLogsCommand = vscode.commands.registerCommand(
    "fileBackup.showLogs",
    () => logger.show()
  );

  // Register auto-backup on save
  const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    const config = vscode.workspace.getConfiguration("fileBackup");
    if (config.get("autoBackupOnSave")) {
      try {
         await backupManager.backupFile(document, false); // Silent auto-backup
       } catch (error) {
         // Auto-backup failures should be silent - only log the error
         logger.error("Auto-backup failed", error);
       }
    }
  });

  // Register event listeners
  const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(
    async () => {
      await statusBarManager.updateStatus();
    }
  );

  // Add to subscriptions for proper cleanup
  context.subscriptions.push(
    backupCommand,
    cleanupCommand,
    rollbackCommand,
    showLogsCommand,
    onSaveListener,
    onDidChangeActiveTextEditor,
    statusBarManager
  );

  // Initialize status bar
  await statusBarManager.updateStatus();
  
  logger.info("File Backup AI Protection extension activated successfully");
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
  const logger = Logger.getInstance();
  logger.info("File Backup AI Protection extension is deactivating...");
  
  // Cancel any active progress operations
  ProgressManager.cancelAll();
  
  // Dispose of managers
  if (backupManager) {
    backupManager.dispose();
  }
  
  if (statusBarManager) {
    statusBarManager.dispose();
  }
  
  // Dispose logger last
  logger.dispose();
  
  logger.info("File Backup AI Protection extension deactivated");
}
