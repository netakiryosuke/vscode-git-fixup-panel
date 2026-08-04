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

	test('reads the post-fixup rebase prompt setting', async () => {
		const extension = findExtension();
		assert.ok(extension, 'Extension should be present');

		const configuration = vscode.workspace.getConfiguration(
			CONFIGURATION_SECTION,
			extension.extensionUri
		);
		const previousGlobalValue = configuration.inspect<boolean>(
			PROMPT_REBASE_AFTER_FIXUP_SETTING
		)?.globalValue;

		try {
			await configuration.update(
				PROMPT_REBASE_AFTER_FIXUP_SETTING,
				true,
				vscode.ConfigurationTarget.Global
			);
			assert.strictEqual(shouldPromptRebaseAfterFixup(extension.extensionUri), true);

			await configuration.update(
				PROMPT_REBASE_AFTER_FIXUP_SETTING,
				false,
				vscode.ConfigurationTarget.Global
			);
			assert.strictEqual(shouldPromptRebaseAfterFixup(extension.extensionUri), false);
		} finally {
			await configuration.update(
				PROMPT_REBASE_AFTER_FIXUP_SETTING,
				previousGlobalValue,
				vscode.ConfigurationTarget.Global
			);
		}
	});
});
