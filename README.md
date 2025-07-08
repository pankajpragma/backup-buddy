# File Backup Extension

A Visual Studio Code extension that provides easy file backup functionality with a single click, folder structure preservation, and automatic cleanup of old backups.

## Features

- **Toolbar Button**: Adds a backup button to the editor title bar
- **Status Bar Icons**: 💾 icon for backup and 🧹 icon for cleanup in the status bar
- **Command Palette**: "Back Up Current File" and "Clean Up Old Backup Files" commands
- **Auto-backup on Save**: Optional automatic backup when files are saved (disabled by default)
- **Folder Structure Preservation**: Maintains the original folder structure in backups
- **Configurable Backup Directory**: Set custom backup location or use default
- **Timestamp Support**: Backup files include timestamps to avoid conflicts
- **Unsaved Changes**: Backs up current editor content, including unsaved changes
- **Automatic Cleanup**: Configurable cleanup of old backup files
- **Manual Cleanup**: Clean up old backups with a single click

## Installation

1. Clone or download this repository
2. Open the folder in VS Code
3. Run `npm install` to install dependencies
4. Run `npm run compile` to build the extension
5. Press `F5` to launch the Extension Development Host

## Usage

### Backup Current File

- Click the backup button (💾) in the editor title bar
- Click the 💾 icon in the status bar
- Use Command Palette (`Ctrl+Shift+P`) and search for "Back Up Current File"

### Clean Up Old Backup Files

- Click the 🧹 icon in the status bar
- Use Command Palette (`Ctrl+Shift+P`) and search for "Clean Up Old Backup Files"

## Configuration

Access settings via `File > Preferences > Settings` and search for "File Backup":

### `fileBackup.backupDirectory`

- **Type**: `string`
- **Default**: `""` (uses `.vscode/backups` in workspace)
- **Description**: Custom backup directory path. If empty, defaults to `.vscode/backups` in the current workspace.

### `fileBackup.autoBackupOnSave`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Automatically backup files when they are saved.

### `fileBackup.preserveFolderStructure`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Preserve the original folder structure in backups.

### `fileBackup.cleanupDays`

- **Type**: `number`
- **Default**: `30`
- **Description**: Number of days to keep backup files before they can be cleaned up.

### `fileBackup.autoCleanup`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Automatically clean up old backup files when creating new backups.

### Configuration

Go to Settings (`Ctrl+,`) and search for "File Backup" to configure:

- **Backup Directory**: Custom path for backup files (leave empty for default)
- **Auto Backup on Save**: Automatically backup files when saved

### Default Backup Location

If no custom directory is set, backups are saved to:

- `.vscode/backups/` in your workspace root
- `backups/` folder next to the file (if no workspace)

### Backup File Format

Backup files are named with the pattern:

```
original-filename.ext.YYYY-MM-DD_HH-MM-SS.bak
```

Example: `script.js.2024-01-15_14-30-25.bak`

## Requirements

- Visual Studio Code 1.74.0 or higher
- Node.js for development

## Development

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm run test
```

### Packaging

```bash
npm install -g vsce
vsce package
```

## Extension Settings

This extension contributes the following settings:

- `fileBackup.backupDirectory`: Custom backup directory path
- `fileBackup.autoBackupOnSave`: Enable automatic backup on file save

## Known Issues

- Cannot backup untitled files (files must be saved first)
- Large files may take a moment to backup

## Release Notes

### 1.0.0

- Initial release
- Basic backup functionality
- Toolbar and status bar integration
- Configurable backup directory
- Auto-backup on save option

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
