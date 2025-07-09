import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Extension should be present", () => {
    assert.ok(
      vscode.extensions.getExtension(
        "pankajdadure.backup-buddy"
      )
    );
  });

  test("Should register backup command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("fileBackup.backupCurrentFile"));
  });

  test("Should register cleanup command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("fileBackup.cleanupOldBackups"));
  });

  test("Should have all configuration properties", () => {
    const config = vscode.workspace.getConfiguration("fileBackup");
    assert.ok(config.has("backupDirectory"));
    assert.ok(config.has("autoBackupOnSave"));
    assert.ok(config.has("preserveFolderStructure"));
    assert.ok(config.has("cleanupDays"));
    assert.ok(config.has("autoCleanup"));
  });

  test("Backup directory setting should have default value", () => {
    const config = vscode.workspace.getConfiguration("fileBackup");
    const backupDir = config.get("backupDirectory");
    assert.strictEqual(typeof backupDir, "string");
  });

  test("Auto backup setting should have default value", () => {
    const config = vscode.workspace.getConfiguration("fileBackup");
    const autoBackup = config.get("autoBackupOnSave");
    assert.strictEqual(typeof autoBackup, "boolean");
    assert.strictEqual(autoBackup, false); // Should be false by default
  });

  test("Preserve folder structure setting should have default value", () => {
    const config = vscode.workspace.getConfiguration("fileBackup");
    const preserveStructure = config.get("preserveFolderStructure");
    assert.strictEqual(typeof preserveStructure, "boolean");
    assert.strictEqual(preserveStructure, true); // Should be true by default
  });

  test("Cleanup days setting should have default value", () => {
    const config = vscode.workspace.getConfiguration("fileBackup");
    const cleanupDays = config.get("cleanupDays");
    assert.strictEqual(typeof cleanupDays, "number");
    assert.strictEqual(cleanupDays, 30); // Should be 30 by default
  });
});
