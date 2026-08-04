import * as assert from 'assert';
import * as vscode from 'vscode';
import { shouldPromptRebaseAfterFixup } from '../configuration';

const EXTENSION_NAME = 'vscode-git-fixup-panel';
const CONFIGURATION_SECTION = 'vscode-git-fixup-panel';
const PROMPT_REBASE_AFTER_FIXUP_SETTING = 'promptRebaseAfterFixup';
const PROMPT_REBASE_AFTER_FIXUP_KEY = `${CONFIGURATION_SECTION}.${PROMPT_REBASE_AFTER_FIXUP_SETTING}`;

function findExtension(): vscode.Extension<unknown> | undefined {
	return vscode.extensions.all.find(extension => extension.packageJSON?.name === EXTENSION_NAME);
}

suite('Configuration Test Suite', () => {
	test('declares the post-fixup rebase prompt setting with a compatible default', () => {
		const extension = findExtension();
		assert.ok(extension, 'Extension should be present');

		const setting = extension.packageJSON?.contributes?.configuration?.properties?.[
			PROMPT_REBASE_AFTER_FIXUP_KEY
		];
		assert.deepStrictEqual(
			{
				type: setting?.type,
				scope: setting?.scope,
				default: setting?.default,
			},
			{
				type: 'boolean',
				scope: 'resource',
				default: true,
			}
		);
	});

	test('resolves the post-fixup rebase prompt setting by resource', () => {
		const extension = findExtension();
		assert.ok(extension, 'Extension should be present');

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(workspaceFolder, 'Test workspace folder should be present');

		const configuration = vscode.workspace.getConfiguration(
			CONFIGURATION_SECTION,
			workspaceFolder.uri
		);
		const inspected = configuration.inspect<boolean>(PROMPT_REBASE_AFTER_FIXUP_SETTING);

		assert.strictEqual(inspected?.workspaceValue, true);
		assert.strictEqual(inspected?.workspaceFolderValue, false);
		assert.strictEqual(shouldPromptRebaseAfterFixup(workspaceFolder.uri), false);
		assert.strictEqual(shouldPromptRebaseAfterFixup(extension.extensionUri), true);
	});
});
