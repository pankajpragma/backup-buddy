# Change Log

All notable changes to the "file-backup-extension" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.0.0] - 2025-07-08

### Added

- Initial release of File Backup Extension
- Backup button in editor title bar with 💾 icon
- Status bar icons: 💾 for backup and 🧹 for cleanup
- Command palette integration with "Back Up Current File" and "Clean Up Old Backup Files" commands
- **Folder Structure Preservation**: Maintains original folder hierarchy in backups
- Configurable backup directory setting
- **Auto-backup on Save**: Optional automatic backup when files are saved (disabled by default)
- **Cleanup Functionality**: Remove backup files older than specified days
- **Auto Cleanup**: Optional automatic cleanup when creating new backups
- Support for backing up unsaved changes
- Automatic backup folder creation
- Timestamp-based backup file naming (YYYY-MM-DD_HH-MM-SS format)
- Recursive cleanup of empty directories
- Enhanced configuration options:
  - `fileBackup.preserveFolderStructure` (default: true)
  - `fileBackup.cleanupDays` (default: 30 days)
  - `fileBackup.autoCleanup` (default: false)
  - `fileBackup.autoBackupOnSave` (default: false)
  - `fileBackup.backupDirectory` (default: workspace/.vscode/backups)
- Toast notifications for successful backups
- Error handling and user feedback
- Clean TypeScript architecture with modular design

### Features

- **Core Functionality**:

  - Backup currently active file with single click
  - Handle unsaved changes in editor
  - Create backup folders automatically
  - Generate timestamped backup files (.bak extension)

- **User Interface**:

  - Editor toolbar button integration
  - Status bar icon for easy access
  - Command palette command
  - Success/error notifications

- **Configuration**:

  - Custom backup directory setting
  - Auto-backup on save option
  - Default to `.vscode/backups` in workspace

- **Technical**:
  - TypeScript implementation
  - Modular architecture with separate managers
  - Proper VS Code extension lifecycle management
  - Error handling and logging

### Technical Details

- Minimum VS Code version: 1.74.0
- Language: TypeScript
- Architecture: Modular design with BackupManager and StatusBarManager
- File naming: `filename.ext.YYYY-MM-DD_HH-MM-SS.bak`

### Known Limitations

- Cannot backup untitled files (must be saved first)
- Large files may take time to backup
- Backup directory must be accessible and writable
