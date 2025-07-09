import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { Logger } from './logger';

const logger = Logger.getInstance();

export class ValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FileValidator {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly ALLOWED_EXTENSIONS = new Set([
    '.ts', '.js', '.tsx', '.jsx', '.vue', '.py', '.java', '.cs', '.cpp', '.c',
    '.h', '.hpp', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
    '.html', '.css', '.scss', '.sass', '.less', '.xml', '.json', '.yaml',
    '.yml', '.md', '.txt', '.sql', '.sh', '.bat', '.ps1', '.dockerfile'
  ]);

  /**
   * Validate file path for security and accessibility
   */
  public static validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('File path is required and must be a string', 'INVALID_PATH');
    }

    // Normalize path to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    
    // Check for directory traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      throw new ValidationError('Directory traversal detected in file path', 'DIRECTORY_TRAVERSAL');
    }

    // Ensure path is absolute
    if (!path.isAbsolute(normalizedPath)) {
      throw new ValidationError('File path must be absolute', 'RELATIVE_PATH');
    }

    // Check for null bytes
    if (normalizedPath.includes('\0')) {
      throw new ValidationError('Null bytes detected in file path', 'NULL_BYTE');
    }

    logger.debug(`File path validated: ${normalizedPath}`);
  }

  /**
   * Validate backup directory path
   */
  public static validateBackupDirectory(dirPath: string): void {
    this.validateFilePath(dirPath);

    // Additional checks for backup directory
    const normalizedPath = path.normalize(dirPath);
    
    // Prevent backing up to system directories
    const systemDirs = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)', '/etc', '/usr', '/var'];
    const isSystemDir = systemDirs.some(sysDir => 
      normalizedPath.toLowerCase().startsWith(sysDir.toLowerCase())
    );
    
    if (isSystemDir) {
      throw new ValidationError('Cannot backup to system directories', 'SYSTEM_DIRECTORY');
    }

    logger.debug(`Backup directory validated: ${normalizedPath}`);
  }

  /**
   * Validate that a file is not within a backup directory to prevent infinite backup loops
   * @param filePath The file path to check
   */
  public static validateNotInBackupDirectory(filePath: string): void {
    const normalizedPath = path.normalize(filePath).toLowerCase();
    
    // Common backup directory patterns
    const backupPatterns = [
      path.sep + '.vscode' + path.sep + 'backups' + path.sep,
      path.sep + 'backups' + path.sep,
      path.sep + '.backup' + path.sep,
      path.sep + 'backup' + path.sep
    ];
    
    // Check if file is in any backup directory pattern
    const isInBackupDir = backupPatterns.some(pattern => 
      normalizedPath.includes(pattern.toLowerCase())
    );
    
    // Also check for .bak extension (backup files)
    const isBackupFile = path.extname(filePath).toLowerCase() === '.bak';
    
    if (isInBackupDir || isBackupFile) {
      throw new ValidationError(
        'Cannot backup files that are already in backup directories or backup files themselves',
        'BACKUP_DIRECTORY_FILE'
      );
    }
    
    logger.debug(`File is not in backup directory: ${filePath}`);
  }

  /**
   * Validate file for backup eligibility
   */
  public static async validateFileForBackup(filePath: string): Promise<void> {
    this.validateFilePath(filePath);

    // Check if file is in a backup directory (prevent infinite backup loops)
    this.validateNotInBackupDirectory(filePath);

    try {
      const stats = await fs.promises.stat(filePath);
      
      // Check if it's a file
      if (!stats.isFile()) {
        throw new ValidationError('Path does not point to a file', 'NOT_A_FILE');
      }

      // Check file size
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new ValidationError(
          `File size (${this.formatBytes(stats.size)}) exceeds maximum allowed size (${this.formatBytes(this.MAX_FILE_SIZE)})`,
          'FILE_TOO_LARGE'
        );
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext && !this.ALLOWED_EXTENSIONS.has(ext)) {
        logger.warn(`File extension ${ext} is not in allowed list, but proceeding with backup`);
      }

      // Check file permissions
      try {
        await fs.promises.access(filePath, fs.constants.R_OK);
      } catch {
        throw new ValidationError('File is not readable', 'FILE_NOT_READABLE');
      }

      logger.debug(`File validated for backup: ${filePath}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'VALIDATION_FAILED');
    }
  }

  /**
   * Validate configuration values
   */
  public static validateConfiguration(config: vscode.WorkspaceConfiguration): void {
    const cleanupDays = config.get<number>('cleanupDays');
    if (cleanupDays !== undefined && (cleanupDays < 1 || cleanupDays > 365)) {
      throw new ValidationError('Cleanup days must be between 1 and 365', 'INVALID_CLEANUP_DAYS');
    }

    const backupDirectory = config.get<string>('backupDirectory');
    if (backupDirectory && backupDirectory.trim()) {
      this.validateBackupDirectory(backupDirectory.trim());
    }

    logger.debug('Configuration validated successfully');
  }

  /**
   * Sanitize file name for backup
   */
  public static sanitizeFileName(fileName: string): string {
    // Remove or replace invalid characters
    const sanitized = fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .trim();

    if (sanitized.length === 0) {
      return 'backup_file';
    }

    return sanitized;
  }

  /**
   * Validate backup file for rollback operations
   * This is different from validateFileForBackup as it allows .bak files
   */
  public static async validateBackupFileForRollback(filePath: string): Promise<void> {
    this.validateFilePath(filePath);

    try {
      const stats = await fs.promises.stat(filePath);
      
      // Check if it's a file
      if (!stats.isFile()) {
        throw new ValidationError('Backup path does not point to a file', 'NOT_A_FILE');
      }

      // Check file size
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new ValidationError(
          `Backup file size (${this.formatBytes(stats.size)}) exceeds maximum allowed size (${this.formatBytes(this.MAX_FILE_SIZE)})`,
          'FILE_TOO_LARGE'
        );
      }

      // Verify it's actually a backup file
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.bak') {
        throw new ValidationError('File is not a backup file (.bak extension required)', 'NOT_BACKUP_FILE');
      }

      // Check file permissions
      try {
        await fs.promises.access(filePath, fs.constants.R_OK);
      } catch {
        throw new ValidationError('Backup file is not readable', 'FILE_NOT_READABLE');
      }

      logger.debug(`Backup file validated for rollback: ${filePath}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Failed to validate backup file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'VALIDATION_FAILED');
    }
  }

  /**
   * Format bytes to human readable string
   */
  private static formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}