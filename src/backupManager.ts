import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "./logger";
import { FileValidator, ValidationError } from "./validation";
import { ProgressManager, ProgressReporter } from "./progressManager";

export class BackupManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private logger = Logger.getInstance();
  private activeOperations = new Set<string>();
  /**
   * Backup the current active file
   */
  public async backupCurrentFile(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage("No active file to backup.");
      this.logger.warn("No active file to backup");
      return;
    }

    if (activeEditor.document.isUntitled) {
      vscode.window.showWarningMessage(
        "Cannot backup untitled files. Please save the file first."
      );
      this.logger.warn("Attempted to backup untitled file");
      return;
    }

    await this.backupFile(activeEditor.document);
  }

  /**
   * Backup a specific document
   * @param document The document to backup
   */
  public async backupFile(document: vscode.TextDocument, showNotifications: boolean = true): Promise<void> {
    const filePath = document.fileName;
    const fileName = path.basename(filePath);
    
    // Check if operation is already in progress for this file
    if (this.activeOperations.has(filePath)) {
      this.logger.warn(`Backup operation already in progress for file: ${filePath}`);
      if (showNotifications) {
        vscode.window.showWarningMessage(`Backup already in progress for ${fileName}`);
      }
      return;
    }
    
    // Mark operation as active
    this.activeOperations.add(filePath);
    
    try {
      this.logger.info(`Starting backup for file: ${filePath}`);
      
      await ProgressManager.withBackupProgress(fileName, async (progress, token) => {
        const reporter = ProgressManager.createReporter(progress, 4);
        
        // Step 1: Validate file
        reporter.nextStep("Validating file");
        await FileValidator.validateFileForBackup(filePath);
        
        if (token.isCancellationRequested) {
          throw new Error("Backup cancelled by user");
        }
        
        // Step 2: Generate backup path
         reporter.nextStep("Generating backup path");
         const backupPath = await this.generateBackupPath(filePath);
         FileValidator.validateBackupDirectory(path.dirname(backupPath));
        
        if (token.isCancellationRequested) {
          throw new Error("Backup cancelled by user");
        }
        
        // Step 3: Ensure directory exists
        reporter.nextStep("Creating backup directory");
        await this.ensureDirectoryExists(path.dirname(backupPath));
        
        if (token.isCancellationRequested) {
          throw new Error("Backup cancelled by user");
        }
        
        // Step 4: Write backup file
        reporter.nextStep("Writing backup file");
        const content = document.getText();
        await fs.promises.writeFile(backupPath, content, "utf8");
        
        // Auto cleanup if enabled
        const config = vscode.workspace.getConfiguration("fileBackup");
        const autoCleanup = config.get<boolean>("autoCleanup");
        if (autoCleanup) {
          await this.cleanupOldBackupsInDirectory(path.dirname(backupPath));
        }
        
        reporter.complete("Backup completed");
        
        this.logger.info(`File backed up successfully: ${backupPath}`);
        if (showNotifications) {
          vscode.window.showInformationMessage(
            `Backup created successfully: ${path.basename(backupPath)}`
          );
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation failed for backup: ${error.message}`, error);
        if (showNotifications) {
          vscode.window.showErrorMessage(`Backup validation failed: ${error.message}`);
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Failed to backup file: ${errorMessage}`, error);
        if (showNotifications) {
          vscode.window.showErrorMessage(`Failed to create backup: ${errorMessage}`);
        }
      }
      throw error; // Re-throw for auto-backup error handling
    } finally {
      // Always remove operation from active set
      this.activeOperations.delete(filePath);
    }
  }

  /**
   * Rollback current file from its latest backup
   */
  public async rollbackCurrentFile(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage("No active file to rollback.");
      this.logger.warn("No active file to rollback");
      return;
    }

    if (activeEditor.document.isUntitled) {
      vscode.window.showWarningMessage(
        "Cannot rollback untitled files. Please save the file first."
      );
      this.logger.warn("Attempted to rollback untitled file");
      return;
    }

    await this.rollbackFile(activeEditor.document.fileName);
  }

  /**
   * Rollback a specific file from its latest backup
   * @param filePath The file path to rollback
   */
  public async rollbackFile(filePath: string): Promise<void> {
    // Check if operation is already in progress for this file
    if (this.activeOperations.has(filePath)) {
      this.logger.warn(`Operation already in progress for file: ${filePath}`);
      vscode.window.showWarningMessage(`Operation already in progress for ${path.basename(filePath)}`);
      return;
    }
    
    // Mark operation as active
    this.activeOperations.add(filePath);
    
    try {
      this.logger.info(`Starting rollback for file: ${filePath}`);
      
      // Find the latest backup
      const latestBackup = await this.findLatestBackup(filePath);
      if (!latestBackup) {
        // Provide detailed diagnostic information
        await this.showBackupDiagnostics(filePath);
        return;
      }

      // Show confirmation dialog with backup details
      const backupInfo = await this.getBackupInfo(latestBackup);
      const confirmation = await vscode.window.showWarningMessage(
        `Are you sure you want to rollback to the backup from ${backupInfo.dateTime}?\n\nThis will replace the current file content and cannot be undone.\n\nBackup file: ${path.basename(latestBackup)}`,
        { modal: true },
        "Rollback",
        "Cancel"
      );

      if (confirmation !== "Rollback") {
        this.logger.info("Rollback cancelled by user");
        return;
      }

      const fileName = path.basename(filePath);
      await ProgressManager.withBackupProgress(`Rolling back ${fileName}`, async (progress, token) => {
        const reporter = ProgressManager.createReporter(progress, 3);
        
        // Step 1: Validate backup file
        reporter.nextStep("Validating backup file");
        await FileValidator.validateBackupFileForRollback(latestBackup);
        
        if (token.isCancellationRequested) {
          throw new Error("Rollback cancelled by user");
        }
        
        // Step 2: Read backup content
        reporter.nextStep("Reading backup content");
        const backupContent = await fs.promises.readFile(latestBackup, 'utf8');
        
        if (token.isCancellationRequested) {
          throw new Error("Rollback cancelled by user");
        }
        
        // Step 3: Write to original file
        reporter.nextStep("Restoring file");
        await fs.promises.writeFile(filePath, backupContent, 'utf8');
        
        reporter.complete("Rollback completed");
        
        this.logger.info(`File rolled back successfully: ${filePath}`);
        
        // Ensure we have a valid dateTime string
        const displayDateTime = backupInfo.dateTime && backupInfo.dateTime !== 'Invalid Date' 
          ? backupInfo.dateTime 
          : 'Unknown Date';
          
        vscode.window.showInformationMessage(
          `File successfully rolled back from backup: ${displayDateTime}`
        );
        
        // Reload the file in editor if it's open
        const openEditor = vscode.window.visibleTextEditors.find(
          editor => editor.document.fileName === filePath
        );
        if (openEditor) {
          await vscode.commands.executeCommand('workbench.action.files.revert');
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Rollback validation failed: ${error.message}`, error);
        vscode.window.showErrorMessage(`Rollback validation failed: ${error.message}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Failed to rollback file: ${errorMessage}`, error);
        vscode.window.showErrorMessage(`Failed to rollback file: ${errorMessage}`);
      }
    } finally {
      // Always remove operation from active set
      this.activeOperations.delete(filePath);
    }
  }

  /**
   * Check if backup exists for current file
   */
  public async hasBackupForCurrentFile(): Promise<boolean> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || activeEditor.document.isUntitled) {
      return false;
    }
    
    const latestBackup = await this.findLatestBackup(activeEditor.document.fileName);
    return latestBackup !== null;
  }

  /**
   * Show detailed diagnostics when no backup is found
   * @param filePath The file path being searched
   */
  private async showBackupDiagnostics(filePath: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("fileBackup");
      const customBackupDir = config.get<string>("backupDirectory");
      const preserveFolderStructure = config.get<boolean>("preserveFolderStructure", true);
      
      let backupDir: string;
      let diagnosticInfo: string[] = [];
      
      diagnosticInfo.push(`🔍 Backup Diagnostics for: ${path.basename(filePath)}`);
      diagnosticInfo.push(``);
      
      // Determine backup directory
      if (customBackupDir && customBackupDir.trim()) {
        backupDir = path.isAbsolute(customBackupDir)
          ? customBackupDir
          : path.resolve(customBackupDir);
        diagnosticInfo.push(`📁 Custom backup directory: ${backupDir}`);
      } else {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          vscode.Uri.file(filePath)
        );
        if (!workspaceFolder) {
          diagnosticInfo.push(`❌ No workspace folder found`);
          diagnosticInfo.push(`💡 Solution: Open the file within a VS Code workspace`);
          
          const message = diagnosticInfo.join('\n');
          this.logger.warn(`Backup diagnostics: ${message}`);
          vscode.window.showWarningMessage(
            "No backup found. File must be opened within a VS Code workspace to use backups.",
            "Create Backup"
          ).then(selection => {
            if (selection === "Create Backup") {
              vscode.commands.executeCommand("fileBackup.backupCurrentFile");
            }
          });
          return;
        }
        backupDir = path.join(workspaceFolder.uri.fsPath, ".vscode", "backups");
        diagnosticInfo.push(`📁 Default backup directory: ${backupDir}`);
      }
      
      // Add folder structure if enabled
      if (preserveFolderStructure) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          vscode.Uri.file(filePath)
        );
        if (workspaceFolder) {
          const relativePath = path.relative(
            workspaceFolder.uri.fsPath,
            path.dirname(filePath)
          );
          if (relativePath && !relativePath.startsWith("..")) {
            backupDir = path.join(backupDir, relativePath);
            diagnosticInfo.push(`📂 With folder structure: ${backupDir}`);
          }
        }
      }
      
      // Check if backup directory exists
      let directoryExists = false;
      try {
        await fs.promises.access(backupDir, fs.constants.F_OK);
        directoryExists = true;
        diagnosticInfo.push(`✅ Backup directory exists`);
      } catch {
        diagnosticInfo.push(`❌ Backup directory does not exist`);
        diagnosticInfo.push(`💡 Solution: Create a backup first using Ctrl+Shift+P → "File Backup: Backup Current File"`);
      }
      
      if (directoryExists) {
        // Check for files in directory
        const files = await fs.promises.readdir(backupDir);
        const fileName = path.basename(filePath);
        const candidateFiles = files.filter(file => file.startsWith(fileName + '.') && file.endsWith('.bak'));
        
        diagnosticInfo.push(``);
        diagnosticInfo.push(`📋 Directory contents: ${files.length} files total`);
        diagnosticInfo.push(`🔍 Looking for files starting with: ${fileName}.`);
        diagnosticInfo.push(`📄 Found ${candidateFiles.length} potential backup files`);
        
        if (candidateFiles.length > 0) {
          diagnosticInfo.push(``);
          diagnosticInfo.push(`📝 Backup files found:`);
          candidateFiles.forEach(file => {
            const timestamp = this.extractTimestampFromBackup(file);
            diagnosticInfo.push(`   • ${file} ${timestamp ? '✅' : '❌ Invalid timestamp'}`);
          });
          
          const validBackups = candidateFiles.filter(file => this.extractTimestampFromBackup(file) !== null);
          if (validBackups.length === 0) {
            diagnosticInfo.push(``);
            diagnosticInfo.push(`❌ No backup files have valid timestamps`);
            diagnosticInfo.push(`💡 Solution: Create a new backup to ensure proper timestamp format`);
          }
        } else {
          diagnosticInfo.push(`❌ No backup files found for this file`);
          diagnosticInfo.push(`💡 Solution: Create a backup first`);
        }
      }
      
      const message = diagnosticInfo.join('\n');
      this.logger.info(`Backup diagnostics: ${message}`);
      
      // Show user-friendly message with action
      vscode.window.showWarningMessage(
        "No backup found for this file. Would you like to create one now?",
        "Create Backup",
        "Show Details"
      ).then(selection => {
        if (selection === "Create Backup") {
          vscode.commands.executeCommand("fileBackup.backupCurrentFile");
        } else if (selection === "Show Details") {
          // Show detailed diagnostics in output channel
          const outputChannel = vscode.window.createOutputChannel("File Backup Diagnostics");
          outputChannel.clear();
          outputChannel.appendLine(message);
          outputChannel.show();
        }
      });
      
    } catch (error) {
      this.logger.error(`Error in backup diagnostics`, error);
      vscode.window.showWarningMessage(
        "No backup found for this file. Create a backup first.",
        "Create Backup"
      ).then(selection => {
        if (selection === "Create Backup") {
          vscode.commands.executeCommand("fileBackup.backupCurrentFile");
        }
      });
    }
  }

  /**
   * Find the latest backup for a given file
   * @param filePath The original file path
   * @returns The path to the latest backup file, or null if none found
   */
  private async findLatestBackup(filePath: string): Promise<string | null> {
    try {
      const config = vscode.workspace.getConfiguration("fileBackup");
      const customBackupDir = config.get<string>("backupDirectory");
      const preserveFolderStructure = config.get<boolean>("preserveFolderStructure", true);
      
      let backupDir: string;
      
      if (customBackupDir && customBackupDir.trim()) {
        backupDir = path.isAbsolute(customBackupDir)
          ? customBackupDir
          : path.resolve(customBackupDir);
      } else {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          vscode.Uri.file(filePath)
        );
        if (!workspaceFolder) {
          return null;
        }
        backupDir = path.join(workspaceFolder.uri.fsPath, ".vscode", "backups");
      }
      
      // Add folder structure if enabled
      if (preserveFolderStructure) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          vscode.Uri.file(filePath)
        );
        if (workspaceFolder) {
          const relativePath = path.relative(
            workspaceFolder.uri.fsPath,
            path.dirname(filePath)
          );
          if (relativePath && !relativePath.startsWith("..")) {
            backupDir = path.join(backupDir, relativePath);
          }
        }
      }
      
      // Check if backup directory exists
      try {
        await fs.promises.access(backupDir, fs.constants.F_OK);
      } catch {
        return null;
      }
      
      const fileName = path.basename(filePath);
      const files = await fs.promises.readdir(backupDir);
      
      // Find all backup files for this file
      const candidateFiles = files.filter(file => file.startsWith(fileName + '.') && file.endsWith('.bak'));
      
      const backupFiles = candidateFiles
        .map(file => {
          const timestamp = this.extractTimestampFromBackup(file);
          return {
            name: file,
            path: path.join(backupDir, file),
            timestamp
          };
        })
        .filter(backup => backup.timestamp !== null)
        .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());
      
      return backupFiles.length > 0 ? backupFiles[0].path : null;
    } catch (error) {
      this.logger.error(`Error finding latest backup for ${filePath}`, error);
      return null;
    }
  }

  /**
   * Extract timestamp from backup filename
   * @param backupFileName The backup filename
   * @returns The extracted date or null if invalid
   */
  private extractTimestampFromBackup(backupFileName: string): Date | null {
    try {
      // Extract timestamp from filename like: file.ext.2024-01-15_14-30-45.bak
      const match = backupFileName.match(/\.(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.bak$/);
      if (!match) {
        return null;
      }
      
      // Split date and time parts, then format correctly
      const [datePart, timePart] = match[1].split('_');
      const timeFormatted = timePart.replace(/-/g, ':');
      const isoString = `${datePart}T${timeFormatted}`;
      
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Get backup file information
   * @param backupPath The backup file path
   * @returns Backup information
   */
  private async getBackupInfo(backupPath: string): Promise<{ dateTime: string; size: string }> {
    try {
      const stats = await fs.promises.stat(backupPath);
      const fileName = path.basename(backupPath);
      const timestamp = this.extractTimestampFromBackup(fileName);
      
      const dateTime = timestamp && !isNaN(timestamp.getTime())
        ? timestamp.toLocaleString()
        : stats.mtime.toLocaleString();
      
      const size = this.formatBytes(stats.size);
      
      return { dateTime, size };
    } catch (error) {
      this.logger.error(`Error getting backup info for ${backupPath}`, error);
      return { dateTime: 'Unknown', size: 'Unknown' };
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  /**
   * Generate backup path for a file
   * @param filePath The original file path
   * @returns The backup file path
   */
  private async generateBackupPath(filePath: string): Promise<string> {
    const config = vscode.workspace.getConfiguration("fileBackup");
    const customBackupDir = config.get<string>("backupDirectory");
    const preserveFolderStructure = config.get<boolean>(
      "preserveFolderStructure",
      true
    );

    let backupDir: string;

    if (customBackupDir && customBackupDir.trim()) {
      // Use custom backup directory
      backupDir = path.isAbsolute(customBackupDir)
        ? customBackupDir
        : path.resolve(customBackupDir);
    } else {
      // Use default .vscode/backups in workspace
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        vscode.Uri.file(filePath)
      );

      if (workspaceFolder) {
        backupDir = path.join(workspaceFolder.uri.fsPath, ".vscode", "backups");
      } else {
        // Fallback to file's directory if no workspace
        backupDir = path.join(path.dirname(filePath), "backups");
      }
    }

    // Preserve folder structure if enabled
    if (preserveFolderStructure) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        vscode.Uri.file(filePath)
      );

      if (workspaceFolder) {
        // Get relative path from workspace root
        const relativePath = path.relative(
          workspaceFolder.uri.fsPath,
          path.dirname(filePath)
        );
        if (relativePath && !relativePath.startsWith("..")) {
          backupDir = path.join(backupDir, relativePath);
        }
      }
    }

    const fileName = path.basename(filePath);
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .substring(0, 19);
    const backupFileName = `${fileName}.${timestamp}.bak`;

    return path.join(backupDir, backupFileName);
  }

  /**
   * Ensure directory exists, create if it doesn't
   * @param dirPath The directory path to ensure exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath, fs.constants.F_OK);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Clean up old backup files based on configuration
   */
  public async cleanupOldBackups(): Promise<void> {
    try {
      this.logger.info("Starting cleanup of old backup files");
      
      await ProgressManager.withCleanupProgress(async (progress, token) => {
        const config = vscode.workspace.getConfiguration("fileBackup");
        
        // Validate configuration
        FileValidator.validateConfiguration(config);
        
        const customBackupDir = config.get<string>("backupDirectory");
        let backupDirs: string[] = [];

        if (customBackupDir && customBackupDir.trim()) {
          // Use custom backup directory
          const backupDir = path.isAbsolute(customBackupDir)
            ? customBackupDir
            : path.resolve(customBackupDir);
          FileValidator.validateBackupDirectory(backupDir);
          backupDirs.push(backupDir);
        } else {
          // Use default .vscode/backups in all workspace folders
          if (vscode.workspace.workspaceFolders) {
            for (const folder of vscode.workspace.workspaceFolders) {
              const backupDir = path.join(
                folder.uri.fsPath,
                ".vscode",
                "backups"
              );
              backupDirs.push(backupDir);
            }
          }
        }

        const reporter = ProgressManager.createReporter(progress, backupDirs.length + 1);
        
        let totalCleaned = 0;
        for (const backupDir of backupDirs) {
          if (token.isCancellationRequested) {
            this.logger.info("Cleanup cancelled by user");
            throw new Error("Cleanup cancelled by user");
          }
          
          reporter.nextStep(`Cleaning ${path.basename(backupDir)}`);
          const cleaned = await this.cleanupOldBackupsInDirectory(backupDir);
          totalCleaned += cleaned;
          this.logger.debug(`Cleaned ${cleaned} files from ${backupDir}`);
        }

        reporter.complete("Cleanup completed");
        
        if (totalCleaned > 0) {
          const message = `Cleaned up ${totalCleaned} old backup file(s).`;
          this.logger.info(message);
          vscode.window.showInformationMessage(message);
        } else {
          const message = "No old backup files to clean up.";
          this.logger.info(message);
          vscode.window.showInformationMessage(message);
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Cleanup validation failed: ${error.message}`, error);
        vscode.window.showErrorMessage(`Cleanup validation failed: ${error.message}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Failed to clean up backups: ${errorMessage}`, error);
        vscode.window.showErrorMessage(`Failed to clean up backups: ${errorMessage}`);
      }
    }
  }

  /**
   * Clean up old backup files in a specific directory
   * @param backupDir The backup directory to clean
   * @returns Number of files cleaned up
   */
  private async cleanupOldBackupsInDirectory(
    backupDir: string
  ): Promise<number> {
    try {
      // Check if directory exists
      await fs.promises.access(backupDir, fs.constants.F_OK);
    } catch {
      // Directory doesn't exist, nothing to clean
      this.logger.debug(`Backup directory does not exist: ${backupDir}`);
      return 0;
    }

    const config = vscode.workspace.getConfiguration("fileBackup");
    const cleanupDays = config.get<number>("cleanupDays", 30);
    
    // Validate and sanitize cleanup days
    const validCleanupDays = Math.max(1, Math.min(365, cleanupDays));
    if (validCleanupDays !== cleanupDays) {
      this.logger.warn(`Invalid cleanup days value: ${cleanupDays}, using ${validCleanupDays}`);
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - validCleanupDays);
    
    this.logger.debug(`Cleaning files older than ${cutoffDate.toISOString()} in ${backupDir}`);

    let cleanedCount = 0;

    try {
      const files = await this.getAllBackupFiles(backupDir);

      for (const filePath of files) {
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.mtime < cutoffDate) {
            // Additional safety check - ensure it's actually a .bak file
            if (path.extname(filePath).toLowerCase() === '.bak') {
              await fs.promises.unlink(filePath);
              cleanedCount++;
              this.logger.debug(`Deleted old backup file: ${filePath}`);
            } else {
              this.logger.warn(`Skipping non-backup file in backup directory: ${filePath}`);
            }
          }
        } catch (error) {
          this.logger.error(`Error processing file ${filePath}`, error);
          // Continue with other files even if one fails
        }
      }

      // Clean up empty directories
      await this.cleanupEmptyDirectories(backupDir);
    } catch (error) {
      this.logger.error(`Error cleaning directory ${backupDir}`, error);
      // Don't throw here, continue with other directories
    }

    return cleanedCount;
  }

  /**
   * Recursively get all backup files in a directory
   * @param dir The directory to search
   * @returns Array of backup file paths
   */
  private async getAllBackupFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getAllBackupFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith(".bak")) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.error(`Error reading directory ${dir}`, error);
    }

    return files;
  }

  /**
   * Clean up empty directories recursively
   * @param dir The directory to check and clean
   */
  private async cleanupEmptyDirectories(dir: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir);

      // Recursively clean subdirectories first
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        try {
          const stats = await fs.promises.stat(fullPath);
          if (stats.isDirectory()) {
            await this.cleanupEmptyDirectories(fullPath);
          }
        } catch (error) {
          this.logger.debug(`Error accessing ${fullPath} during cleanup`, error);
          // Continue with other entries
        }
      }

      // Check if directory is now empty
      const updatedEntries = await fs.promises.readdir(dir);
      if (updatedEntries.length === 0) {
        // Don't remove the main backup directory
        const config = vscode.workspace.getConfiguration("fileBackup");
        const customBackupDir = config.get<string>("backupDirectory");
        const isMainBackupDir = customBackupDir
          ? path.resolve(customBackupDir) === path.resolve(dir)
          : dir.endsWith(path.join(".vscode", "backups"));

        if (!isMainBackupDir) {
          await fs.promises.rmdir(dir);
          this.logger.debug(`Removed empty directory: ${dir}`);
        } else {
          this.logger.debug(`Preserving main backup directory: ${dir}`);
        }
      }
    } catch (error) {
      // Directory might not exist or might not be empty, which is fine
      this.logger.debug(`Could not clean directory ${dir}`, error);
    }
  }
}
