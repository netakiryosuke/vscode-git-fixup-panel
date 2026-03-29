import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Git Fixup Panel - Extension Test Suite', () => {
  test('extension should be present', async () => {
    const ext = vscode.extensions.getExtension('undefined_publisher.vscode-git-fixup-panel');
    assert.ok(ext, 'Extension should be present');
  });

  test('fixup command should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('vscode-git-fixup-panel.fixup'), 'fixup command should be registered');
  });

  test('rebaseAutosquash command should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('vscode-git-fixup-panel.rebaseAutosquash'), 'rebaseAutosquash command should be registered');
  });
});
