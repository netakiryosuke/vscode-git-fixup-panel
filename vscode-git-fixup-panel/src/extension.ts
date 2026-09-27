import * as vscode from 'vscode';
import { fixupCommand } from './commands/fixup';
import { rebaseAutosquashCommand } from './commands/rebaseAutosquash';
import { gitlensFixupCommand } from './integrations/gitlens';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-git-fixup-panel.fixup', fixupCommand),
    vscode.commands.registerCommand('vscode-git-fixup-panel.rebaseAutosquash', rebaseAutosquashCommand),
    vscode.commands.registerCommand('vscode-git-fixup-panel.gitlensFixup', gitlensFixupCommand),
  );
}

export function deactivate() {}
