import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Git Fixup Panel - Extension Test Suite', () => {
  async function activateExtension(): Promise<void> {
    const ext = vscode.extensions.getExtension('undefined_publisher.vscode-git-fixup-panel');
    assert.ok(ext, 'Extension should be present');
    // activate未実行の場合コマンドが登録されていないため明示的に起動する
    if (!ext.isActive) {
      await ext.activate();
    }
  }

  test('extension should be present', async () => {
    const ext = vscode.extensions.getExtension('undefined_publisher.vscode-git-fixup-panel');
    assert.ok(ext, 'Extension should be present');
  });

  test('fixup command should be registered', async () => {
    await activateExtension();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('vscode-git-fixup-panel.fixup'), 'fixup command should be registered');
  });

  test('rebaseAutosquash command should be registered', async () => {
    await activateExtension();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('vscode-git-fixup-panel.rebaseAutosquash'), 'rebaseAutosquash command should be registered');
  });
});
