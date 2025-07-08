# 🛡️ Backup Buddy - AI-Safe File Protection

**Protect Your Code During AI-Assisted Development**

A professional VS Code extension designed to safeguard your intellectual property while working with AI assistants like GitHub Copilot, ChatGPT, and Claude. Create instant backups with folder structure preservation and automatic cleanup.

## 🎯 Why Backup Buddy?

In the era of AI-assisted coding, protecting your original work is crucial:

- **🤖 AI Safety**: Secure your code before AI modifications
- **💡 IP Protection**: Preserve original implementations
- **🔄 Version Control**: Track changes during AI collaboration
- **⚡ Instant Backup**: One-click protection for critical files
- **🗂️ Smart Organization**: Maintain folder structure in backups

## ✨ Key Features

### 🎛️ **Professional Interface**

- **📍 Editor Toolbar Button**: Prominent save icon (💾) in top-right corner
- **📊 Status Bar Integration**: Always-visible backup status indicator
- **⌨️ Command Palette**: Quick access via `Ctrl+Shift+P`
- **🎨 Professional Icons**: High-contrast, easily identifiable buttons

### 🔧 **Advanced Functionality**

- **📁 Folder Structure Preservation**: Maintains original directory hierarchy
- **🧹 Automatic Cleanup**: Configurable old file removal (30-day default)
- **⏰ Timestamp Naming**: `filename_YYYYMMDD_HHMMSS.ext` format
- **💾 Unsaved Changes Support**: Backup even modified files
- **🔄 Auto-Backup on Save**: Optional automatic protection

## 🚀 Installation

1. **VS Code Marketplace**: Search "Backup Buddy" in Extensions
2. **Command Line**: `code --install-extension pankajdadure.backup-buddy`
3. **Manual**: Download `.vsix` from releases

## 📖 Usage Guide

### 🎯 **Icon Visibility & Location**

#### **Editor Toolbar Button** 💾

- **Location**: Top-right corner of active editor
- **Visibility**: Only when file is focused and open
- **Icon**: Professional save/disk symbol
- **Color**: Adapts to VS Code theme (light/dark)
- **Size**: Standard toolbar icon (16x16px)

#### **Status Bar Indicator**

- **Location**: Bottom status bar (right side)
- **Always Visible**: Persistent across all files
- **Shows**: Backup count and last backup time
- **Click Action**: Quick backup of current file

### 🔄 **AI Development Workflow**

```mermaid
graph LR
    A[Write Code] --> B[💾 Backup]
    B --> C[AI Assistant]
    C --> D[Review Changes]
    D --> E[Keep/Restore]
```

1. **Before AI Interaction**: Click 💾 to backup current state
2. **During AI Coding**: Let Copilot/ChatGPT suggest changes
3. **After AI Changes**: Compare with backup if needed
4. **Decision Point**: Keep AI changes or restore from backup

### ⚡ **Quick Actions**

| Action              | Method          | Shortcut                    |
| ------------------- | --------------- | --------------------------- |
| Backup Current File | Toolbar Button  | Click 💾                    |
| Backup via Command  | Command Palette | `Ctrl+Shift+P` → "Back Up"  |
| Auto-Backup Setup   | Settings        | Search "Backup Buddy"       |
| Cleanup Old Files   | Command Palette | "Clean Up Old Backup Files" |

## ⚙️ Configuration

### 🎛️ **Settings Overview**

Access via: `File` → `Preferences` → `Settings` → Search "Backup Buddy"

```json
{
  "fileBackup.backupDirectory": "",
  "fileBackup.autoBackupOnSave": false,
  "fileBackup.preserveFolderStructure": true,
  "fileBackup.cleanupDays": 30,
  "fileBackup.autoCleanup": false
}
```

### 📁 **Directory Structure**

**Default Location**: `.vscode/backups/`

```
project/
├── .vscode/
│   └── backups/
│       ├── src/
│       │   ├── app.js_20231201_143022.js
│       │   └── utils.js_20231201_143045.js
│       └── README.md_20231201_143100.md
└── src/
    ├── app.js
    └── utils.js
```

**Custom Directory Example**:

```
C:/MyBackups/
├── ProjectA/
│   └── src/
│       └── component.tsx_20231201_143022.tsx
└── ProjectB/
    └── api/
        └── routes.js_20231201_143045.js
```

## 🤖 AI Integration Scenarios

### **GitHub Copilot Workflow**

1. 💾 Backup before accepting suggestions
2. Review Copilot's code changes
3. Compare with original implementation
4. Keep improvements, restore if needed

### **ChatGPT/Claude Integration**

1. 💾 Backup current working file
2. Copy code to AI assistant
3. Apply suggested modifications
4. Test and validate changes
5. Restore from backup if issues arise

### **Refactoring Protection**

1. 💾 Backup entire module before AI refactoring
2. Let AI suggest improvements
3. Apply changes incrementally
4. Maintain backup trail for rollback

## 🛠️ Development

### **Building from Source**

```bash
git clone https://github.com/pankajpragma/backup-buddy.git
cd backup-buddy
npm install
npm run compile
```

### **Testing**

```bash
npm test          # Run test suite
npm run lint      # Code quality check
npm run watch     # Development mode
```

### **Extension Development**

1. Press `F5` to launch Extension Development Host
2. Test features in new VS Code window
3. Debug with breakpoints in source code

## 📊 **Performance & Security**

- **⚡ Fast**: Minimal impact on VS Code performance
- **🔒 Secure**: Local file operations only
- **💾 Efficient**: Configurable cleanup prevents disk bloat
- **🎯 Targeted**: Only backs up when explicitly requested

## 🆘 **Troubleshooting**

### **Icon Not Visible?**

- Ensure file is open and focused
- Check if editor toolbar is enabled
- Restart VS Code if needed

### **Backup Location Issues?**

- Verify write permissions
- Check custom directory path
- Use default location if custom fails

### **Performance Concerns?**

- Enable auto-cleanup
- Reduce cleanup days setting
- Use specific backup directory

## 📝 **Release Notes**

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### **Latest: v1.0.2**

- 🛡️ Enhanced AI protection focus
- 🎨 Professional icon improvements
- 📚 Comprehensive documentation
- 🔍 Marketplace keyword optimization

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

**🌟 Star this project on [GitHub](https://github.com/pankajpragma/backup-buddy) if it helps protect your code!**

**🐛 Found an issue? [Report it here](https://github.com/pankajpragma/backup-buddy/issues)**
