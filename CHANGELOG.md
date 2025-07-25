# Change Log

All notable changes to the "Backup Buddy" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.0.3] - 2024-12-19

### Fixed
- **Critical Bug Fix**: Prevented infinite backup loops when editing files in backup directories
- **UI Bug Fix**: Fixed multiple alert dialogs appearing when backup fails - now shows only one alert
- Added validation to exclude files already in backup directories (`.vscode/backups`, `backups`, `.backup`, `backup`)
- Added validation to exclude `.bak` files from being backed up again
- Enhanced file validation with `validateNotInBackupDirectory` method
- Made auto-backup operations silent to prevent notification spam

### Security
- Improved backup directory detection to prevent accidental recursive backups
- Added comprehensive path pattern matching for backup directory identification

### Changed
- Version bump to 1.0.3
- Enhanced validation logic in backup workflow

## [1.0.2] - 2024-12-19

### Added
- **Rollback Feature**: New rollback functionality to restore files from their latest backup
  - `fileBackup.rollbackCurrentFile` command to rollback the active file
  - Confirmation dialog with backup details (date, time, file size)
  - Smart toolbar icon that appears only when backups exist for the current file
  - Progress reporting during rollback operations
- **Centralized Logging System**: Comprehensive logging with different levels (DEBUG, INFO, WARN, ERROR) and dedicated output channel
- **Input Validation and Security**: File path validation, backup directory validation, and security checks to prevent malicious operations
- **Progress Indicators**: Visual progress reporting for long-running operations like cleanup and bulk backups
- **Enhanced Error Handling**: Improved error messages and user feedback throughout the extension
- **Show Logs Command**: New command `fileBackup.showLogs` to display extension logs for debugging

### Enhanced
- **Status Bar**: Added dynamic rollback button (↩️) that appears only when backups exist for the current file
- **Backup Operations**: Added step-by-step progress reporting and comprehensive validation
- **Cleanup Operations**: Enhanced with progress tracking and better error handling
- **Status Bar Integration**: Integrated logging for better debugging and monitoring
- **Extension Lifecycle**: Improved activation and deactivation with proper cleanup

### Security
- Added file path traversal protection
- Implemented backup directory validation
- Added file size and type validation
- Enhanced error handling to prevent information leakage
- Rollback operations include validation and confirmation prompts

### Technical
- Refactored codebase with better separation of concerns
- Added comprehensive TypeScript types and interfaces
- Improved code maintainability and extensibility
- Async/await pattern implementation for better performance

### Changed
- Version bump for maintenance release

## [1.0.1] - 2024-01-15

### 🛡️ AI Protection Focus
- **Enhanced Description**: AI-safe file backup with focus on protecting code from AI assistants (Copilot, ChatGPT, Claude)
- **Marketplace Keywords**: Added 11 new AI-focused keywords for better discovery
- **Professional Documentation**: Complete README rewrite with AI workflow integration guides
- **Icon Visibility**: Detailed descriptions of button locations and professional presentation
- **Developer-Focused**: Enhanced language targeting AI development scenarios

### 🎨 Professional Enhancements
- **Branding Update**: AI protection messaging throughout documentation
- **Visual Improvements**: Professional icon descriptions and visibility guidelines
- **User Experience**: Enhanced interface descriptions with emoji-based navigation
- **Workflow Integration**: Specific AI assistant integration scenarios and best practices

## [1.0.0] - 2025-07-08

### Added

- Initial release of Backup Buddy
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
