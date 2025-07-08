import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class BackupManager {
  /**
   * Backup the currently active file
   */
  public async backupCurrentFile(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage("No active file to backup.");
      return;
    }

    await this.backupFile(activeEditor.document);
  }

  /**
   * Backup a specific document
   * @param document The document to backup
   */
  public async backupFile(document: vscode.TextDocument): Promise<void> {
    try {
      // Skip untitled documents
      if (document.isUntitled) {
        vscode.window.showWarningMessage(
          "Cannot backup untitled files. Please save the file first."
        );
        return;
      }

      const config = vscode.workspace.getConfiguration("fileBackup");
      const backupPath = await this.getBackupPath(document.fileName);
      const content = document.getText();

      // Ensure backup directory exists
      await this.ensureDirectoryExists(path.dirname(backupPath));

      // Write backup file
      await fs.promises.writeFile(backupPath, content, "utf8");

      // Auto cleanup if enabled
      const autoCleanup = config.get<boolean>("autoCleanup");
      if (autoCleanup) {
        await this.cleanupOldBackupsInDirectory(path.dirname(backupPath));
      }

      vscode.window.showInformationMessage(
        `Backup created successfully: ${path.basename(backupPath)}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        `Failed to create backup: ${errorMessage}`
      );
      console.error("Backup error:", error);
    }
  }

  /**
   * Get the backup file path for a given file
   * @param filePath The original file path
   * @returns The backup file path
   */
  private async getBackupPath(filePath: string): Promise<string> {
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
      const config = vscode.workspace.getConfiguration("fileBackup");
      const customBackupDir = config.get<string>("backupDirectory");

      let backupDirs: string[] = [];

      if (customBackupDir && customBackupDir.trim()) {
        // Use custom backup directory
        const backupDir = path.isAbsolute(customBackupDir)
          ? customBackupDir
          : path.resolve(customBackupDir);
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

      let totalCleaned = 0;
      for (const backupDir of backupDirs) {
        const cleaned = await this.cleanupOldBackupsInDirectory(backupDir);
        totalCleaned += cleaned;
      }

      if (totalCleaned > 0) {
        vscode.window.showInformationMessage(
          `Cleaned up ${totalCleaned} old backup file(s).`
        );
      } else {
        vscode.window.showInformationMessage(
          "No old backup files to clean up."
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        `Failed to clean up backups: ${errorMessage}`
      );
      console.error("Cleanup error:", error);
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
      return 0;
    }

    const config = vscode.workspace.getConfiguration("fileBackup");
    const cleanupDays = config.get<number>("cleanupDays", 30);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);

    let cleanedCount = 0;

    try {
      const files = await this.getAllBackupFiles(backupDir);

      for (const filePath of files) {
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.mtime < cutoffDate) {
            await fs.promises.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
        }
      }

      // Clean up empty directories
      await this.cleanupEmptyDirectories(backupDir);
    } catch (error) {
      console.error(`Error cleaning directory ${backupDir}:`, error);
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
      console.error(`Error reading directory ${dir}:`, error);
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
        const stats = await fs.promises.stat(fullPath);
        if (stats.isDirectory()) {
          await this.cleanupEmptyDirectories(fullPath);
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
        }
      }
    } catch (error) {
      // Directory might not exist or might not be empty, which is fine
    }
  }
}
