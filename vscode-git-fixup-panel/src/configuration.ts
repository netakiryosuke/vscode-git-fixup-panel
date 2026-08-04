import * as vscode from 'vscode';

const CONFIGURATION_SECTION = 'vscode-git-fixup-panel';
const PROMPT_REBASE_AFTER_FIXUP_SETTING = 'promptRebaseAfterFixup';
const DEFAULT_PROMPT_REBASE_AFTER_FIXUP = true;

export function shouldPromptRebaseAfterFixup(resource: vscode.Uri): boolean {
	return vscode.workspace
		.getConfiguration(CONFIGURATION_SECTION, resource)
		.get<boolean>(PROMPT_REBASE_AFTER_FIXUP_SETTING, DEFAULT_PROMPT_REBASE_AFTER_FIXUP);
}
