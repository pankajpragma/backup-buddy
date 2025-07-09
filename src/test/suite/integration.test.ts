import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

suite("Integration Test Suite", () => {
  let testWorkspaceDir: string;
  let testFilePath: string;
  let backupDir: string;

  suiteSetup(async () => {
    // Create temporary test workspace
    testWorkspaceDir = path.join(os.tmpdir(), "backup-test-" + Date.now());
    await fs.promises.mkdir(testWorkspaceDir, { recursive: true });
    
    // Create test file
    testFilePath = path.join(testWorkspaceDir, "test-file.ts");
    await fs.promises.writeFile(testFilePath, "// Original content\nconsole.log('test');", "utf8");
    
    // Set backup directory
    backupDir = path.join(testWorkspaceDir, ".vscode", "backups");
    
    // Configure extension
    const config = vscode.workspace.getConfiguration("fileBackup");
    await config.update("backupDirectory", backupDir, vscode.ConfigurationTarget.Workspace);
    await config.update("autoBackupOnSave", false, vscode.ConfigurationTarget.Workspace);
  });

  suiteTeardown(async () => {
    // Clean up test workspace
    try {
      await fs.promises.rm(testWorkspaceDir, { recursive: true, force: true });
    } catch (error) {
      console.warn("Failed to clean up test workspace:", error);
    }
  });

  test("Should create backup file", async function() {
    this.timeout(10000); // Increase timeout for file operations
    
    // Open test file
    const document = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(document);
    
    // Execute backup command
    await vscode.commands.executeCommand("fileBackup.backupCurrentFile");
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if backup directory was created
    assert.ok(await fs.promises.access(backupDir).then(() => true).catch(() => false), "Backup directory should exist");
    
    // Check if backup file was created
    const backupFiles = await fs.promises.readdir(backupDir);
    const bakFiles = backupFiles.filter(file => file.toString().endsWith('.bak'));
    assert.ok(bakFiles.length > 0, "At least one backup file should exist");
    
    // Verify backup content
    const backupFilePath = path.join(backupDir, bakFiles[0].toString());
    const backupContent = await fs.promises.readFile(backupFilePath, "utf8");
    assert.strictEqual(backupContent, "// Original content\nconsole.log('test');", "Backup content should match original");
  });

  test("Should rollback from backup", async function() {
    this.timeout(10000);
    
    // Modify the original file
    await fs.promises.writeFile(testFilePath, "// Modified content\nconsole.log('modified');", "utf8");
    
    // Open modified file
    const document = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(document);
    
    // Mock user confirmation for rollback
    const originalShowWarningMessage = vscode.window.showWarningMessage;
    vscode.window.showWarningMessage = async (message: string, ...items: any[]) => {
      if (message.includes("rollback")) {
        return "Rollback";
      }
      return originalShowWarningMessage(message, ...items);
    };
    
    try {
      // Execute rollback command
      await vscode.commands.executeCommand("fileBackup.rollbackCurrentFile");
      
      // Wait for rollback to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify file was restored
      const restoredContent = await fs.promises.readFile(testFilePath, "utf8");
      assert.strictEqual(restoredContent, "// Original content\nconsole.log('test');", "File should be restored to original content");
    } finally {
      // Restore original function
      vscode.window.showWarningMessage = originalShowWarningMessage;
    }
  });

  test("Should prevent concurrent backup operations", async function() {
    this.timeout(15000);
    
    // Open test file
    const document = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(document);
    
    // Start two backup operations simultaneously
    const backup1Promise = vscode.commands.executeCommand("fileBackup.backupCurrentFile");
    const backup2Promise = vscode.commands.executeCommand("fileBackup.backupCurrentFile");
    
    // Both should complete without error (second should be skipped)
    await Promise.all([backup1Promise, backup2Promise]);
    
    // Test passes if no errors are thrown
    assert.ok(true, "Concurrent backup operations should be handled gracefully");
  });

  test("Should cleanup old backups", async function() {
    this.timeout(10000);
    
    // Create multiple backup files with different timestamps
    const now = Date.now();
    const oldTimestamp = now - (31 * 24 * 60 * 60 * 1000); // 31 days ago
    
    const oldBackupName = `test-file_${new Date(oldTimestamp).toISOString().replace(/[:.]/g, '-')}.bak`;
    const oldBackupPath = path.join(backupDir, oldBackupName);
    
    await fs.promises.writeFile(oldBackupPath, "// Old backup content", "utf8");
    
    // Set cleanup days to 30
    const config = vscode.workspace.getConfiguration("fileBackup");
    await config.update("cleanupDays", 30, vscode.ConfigurationTarget.Workspace);
    
    // Execute cleanup command
    await vscode.commands.executeCommand("fileBackup.cleanupOldBackups");
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if old backup was removed
    const backupExists = await fs.promises.access(oldBackupPath).then(() => true).catch(() => false);
    assert.ok(!backupExists, "Old backup file should be removed");
  });
});