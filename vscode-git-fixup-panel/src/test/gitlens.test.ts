import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseGitLensTarget } from '../integrations/gitlens';
import { FixupTarget } from '../commands/fixup';

const fixup = require('../commands/fixup') as typeof import('../commands/fixup');
const COMMAND = 'vscode-git-fixup-panel.gitlensFixup';
const SHA = 'a'.repeat(40);
const REPO_PATH = path.resolve('gitlens-test-repo');

// Shape produced by GitLens v19.2.0's buildRowCommitContext and createReference.
function context(webview = 'gitlens.graph') {
	return {
		webview,
		webviewItem: 'gitlens:commit+HEAD+current+rewriteable+unique+unpublished',
		webviewItemValue: {
			type: 'commit',
			ref: { refType: 'revision', ref: SHA, sha: SHA, repoPath: REPO_PATH, name: SHA.slice(0, 8) },
		},
	};
}

suite('GitLens Integration Test Suite', () => {
	test('extracts a target from both graph webviews', () => {
		for (const view of ['gitlens.graph', 'gitlens.views.graph']) {
			assert.deepStrictEqual(parseGitLensTarget(context(view)), { repoPath: REPO_PATH, sha: SHA });
		}
	});

	test('rejects unsupported contexts instead of selecting another target', () => {
		const valid = context();
		for (const input of [
			undefined, null, [], {}, context('unrelated.graph'),
			{ ...valid, listMultiSelection: true },
			{ ...valid, webviewItem: 'gitlens:stash' },
			{ ...valid, webviewItem: 'gitlens:wip' },
			{ ...valid, webviewItem: 'gitlens:commit+unpublished' },
			{ ...valid, webviewItem: 'gitlens:commit+worktreeHEAD+current' },
			{ ...valid, webviewItemValue: null },
			{ ...valid, webviewItemValue: { ...valid.webviewItemValue, type: 'branch' } },
			{ ...valid, webviewItemValue: { ...valid.webviewItemValue, worktreePath: path.resolve('other') } },
		]) {
			assert.strictEqual(parseGitLensTarget(input), undefined, JSON.stringify(input));
		}
		for (const patch of [
			{ refType: 'branch' }, { ref: 'HEAD' }, { ref: '--all' }, { ref: '' },
			{ repoPath: '' }, { repoPath: 'relative/path' }, { repoPath: 'vscode-vfs://repo' },
			{ repoPath: REPO_PATH + '\0' },
		]) {
			assert.strictEqual(parseGitLensTarget({ ...valid, webviewItemValue: {
				...valid.webviewItemValue, ref: { ...valid.webviewItemValue.ref, ...patch },
			} }), undefined);
		}
	});

	test('registered command forwards only validated targets to the shared flow', async () => {
		const extension = vscode.extensions.getExtension('netakiryosuke.vscode-git-fixup-panel');
		assert.ok(extension);
		await extension.activate();
		const original = fixup.createFixup;
		const warning = vscode.window.showWarningMessage;
		const targets: (FixupTarget | undefined)[] = [];
		let warnings = 0;
		try {
			fixup.createFixup = async target => { targets.push(target); };
			vscode.window.showWarningMessage = async () => { warnings++; return undefined; };
			await vscode.commands.executeCommand(COMMAND, context());
			await vscode.commands.executeCommand(COMMAND, {});
			assert.deepStrictEqual(targets, [{ repoPath: REPO_PATH, sha: SHA }]);
			assert.strictEqual(warnings, 1);
		} finally {
			fixup.createFixup = original;
			vscode.window.showWarningMessage = warning;
		}
	});
});
