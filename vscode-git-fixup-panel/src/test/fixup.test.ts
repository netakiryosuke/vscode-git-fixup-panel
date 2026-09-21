import * as assert from 'assert';
import * as vscode from 'vscode';
import { createFixup, fixupCommand } from '../commands/fixup';
import { getFixupTarget, getRepository } from '../git/repository';
import { Repository, Status } from '../types/git';
import { commitAll, createTestRepository, runGit, TestRepository, writeFile } from './gitTestUtils';

const repositories = require('../git/repository') as typeof import('../git/repository');
const configuration = require('../configuration') as typeof import('../configuration');
const TEST_TIMEOUT_MS = 60_000;

suite('Explicit Fixup Target Test Suite', function () {
	this.timeout(TEST_TIMEOUT_MS);
	const originalGetRepository = repositories.getRepository;
	const originalPrompt = configuration.shouldPromptRebaseAfterFixup;
	const originalPicker = vscode.window.showQuickPick;
	const originalError = vscode.window.showErrorMessage;
	const originalInfo = vscode.window.showInformationMessage;
	const originalWarning = vscode.window.showWarningMessage;
	let repo: TestRepository;
	let targetSha: string;
	let model: Repository;
	let requestedPath: string | undefined;
	let errors: string[];
	let warnings: string[];
	let pickerCalls: number;

	setup(async () => {
		repo = await createTestRepository();
		await writeFile(repo.path, 'file.txt', 'root\n');
		await commitAll(repo.path, 'root');
		await writeFile(repo.path, 'file.txt', 'target\n');
		targetSha = await commitAll(repo.path, 'target');
		await writeFile(repo.path, 'file.txt', 'fixed\n');
		model = {
			rootUri: vscode.Uri.file(repo.path), inputBox: { value: '' },
			state: { HEAD: undefined, indexChanges: [], mergeChanges: [], workingTreeChanges: [{
				uri: vscode.Uri.file(repo.path + '/file.txt'), originalUri: vscode.Uri.file(repo.path + '/file.txt'),
				renameUri: undefined, status: Status.MODIFIED,
			}] },
			commit: async () => undefined,
		};
		requestedPath = undefined;
		errors = [];
		warnings = [];
		pickerCalls = 0;
		repositories.getRepository = repoPath => { requestedPath = repoPath; return model; };
		configuration.shouldPromptRebaseAfterFixup = () => false;
		vscode.window.showQuickPick = async () => { pickerCalls++; return undefined; };
		vscode.window.showErrorMessage = async (message: string) => { errors.push(message); return undefined; };
		vscode.window.showInformationMessage = async () => undefined;
		vscode.window.showWarningMessage = async (message: string) => { warnings.push(message); return undefined; };
	});

	teardown(async () => {
		repositories.getRepository = originalGetRepository;
		configuration.shouldPromptRebaseAfterFixup = originalPrompt;
		vscode.window.showQuickPick = originalPicker;
		vscode.window.showErrorMessage = originalError;
		vscode.window.showInformationMessage = originalInfo;
		vscode.window.showWarningMessage = originalWarning;
		await repo?.dispose();
	});

	test('creates a fixup in the explicit repository without opening the picker', async () => {
		await createFixup({ repoPath: repo.path, sha: targetSha });
		assert.strictEqual(requestedPath, repo.path);
		assert.strictEqual(pickerCalls, 0);
		assert.deepStrictEqual(errors, []);
		assert.deepStrictEqual(warnings, []);
		assert.strictEqual((await runGit(repo.path, ['log', '-1', '--format=%s'])).trim(), 'fixup! target');
		assert.strictEqual(await runGit(repo.path, ['show', 'HEAD:file.txt']), 'fixed\n');
	});

	test('only commits staged changes when the index is nonempty', async () => {
		await runGit(repo.path, ['add', 'file.txt']);
		model.state.indexChanges.push(model.state.workingTreeChanges[0]);
		await writeFile(repo.path, 'file.txt', 'unstaged\n');
		await createFixup({ repoPath: repo.path, sha: targetSha });
		assert.strictEqual(await runGit(repo.path, ['show', 'HEAD:file.txt']), 'fixed\n');
		assert.match(await runGit(repo.path, ['diff']), /unstaged/);
	});

	test('keeps the regular picker and cancellation behavior', async () => {
		await fixupCommand();
		assert.strictEqual(requestedPath, undefined);
		assert.strictEqual(pickerCalls, 1);
		assert.strictEqual((await runGit(repo.path, ['rev-parse', 'HEAD'])).trim(), targetSha);
		assert.strictEqual(await runGit(repo.path, ['diff', '--cached']), '');
	});

	test('runs the registered GitLens command through to an actual fixup commit', async () => {
		await vscode.extensions.getExtension('netakiryosuke.vscode-git-fixup-panel')!.activate();
		await vscode.commands.executeCommand('vscode-git-fixup-panel.gitlensFixup', {
			webview: 'gitlens.graph', webviewItem: 'gitlens:commit+current',
			webviewItemValue: { type: 'commit', ref: { refType: 'revision', repoPath: repo.path, ref: targetSha } },
		});
		assert.strictEqual(requestedPath, repo.path);
		assert.strictEqual(pickerCalls, 0);
		assert.deepStrictEqual(errors, []);
		assert.strictEqual((await runGit(repo.path, ['log', '-1', '--format=%s'])).trim(), 'fixup! target');
	});

	test('does not stage when the target repository is not open or has conflicts', async () => {
		repositories.getRepository = () => undefined;
		await createFixup({ repoPath: repo.path, sha: targetSha });
		assert.strictEqual(errors.length, 1);
		repositories.getRepository = () => model;
		model.state.mergeChanges.push(model.state.workingTreeChanges[0]);
		await createFixup({ repoPath: repo.path, sha: targetSha });
		assert.strictEqual(warnings.length, 1);
		assert.strictEqual(await runGit(repo.path, ['diff', '--cached']), '');
	});

	test('rolls back automatic staging when commit creation fails', async () => {
		const original = repositories.runGitFixup;
		try {
			repositories.runGitFixup = async () => { throw new Error('Commit rejected'); };
			await createFixup({ repoPath: repo.path, sha: targetSha });
			assert.strictEqual(errors.length, 1);
			assert.strictEqual(await runGit(repo.path, ['diff', '--cached']), '');
			assert.match(await runGit(repo.path, ['diff']), /fixed/);
		} finally {
			repositories.runGitFixup = original;
		}
	});

	test('rejects missing and malformed targets before staging', async () => {
		for (const sha of ['0'.repeat(40), '--all', 'HEAD']) {
			await createFixup({ repoPath: repo.path, sha });
		}
		assert.strictEqual(errors.length, 3);
		assert.strictEqual(await runGit(repo.path, ['diff', '--cached']), '');
		assert.strictEqual((await runGit(repo.path, ['rev-parse', 'HEAD'])).trim(), targetSha);
	});

	test('rejects a commit from another branch before staging', async () => {
		await runGit(repo.path, ['checkout', '-b', 'other']);
		const otherSha = await commitAll(repo.path, 'other');
		await runGit(repo.path, ['checkout', '--detach', targetSha]);
		await writeFile(repo.path, 'file.txt', 'fixed\n');
		await createFixup({ repoPath: repo.path, sha: otherSha });
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(await runGit(repo.path, ['diff', '--cached']), '');
	});

	test('resolves targets older than the recent twenty commits', async () => {
		for (let i = 0; i < 21; i++) {
			await runGit(repo.path, ['commit', '--allow-empty', '-m', `later ${i}`]);
		}
		assert.strictEqual((await getFixupTarget(targetSha, repo.path)).label, 'target');
	});

	test('keeps the post-fixup prompt when enabled', async () => {
		configuration.shouldPromptRebaseAfterFixup = () => true;
		await createFixup({ repoPath: repo.path, sha: targetSha });
		assert.strictEqual(warnings.length, 1);
		assert.match(warnings[0], /Run autosquash rebase now/);
	});

	test('explicit repository lookup never falls back to the first repository', () => {
		const original = vscode.extensions.getExtension;
		try {
			vscode.extensions.getExtension = (<T>() => ({
				exports: { enabled: true, getAPI: () => ({ repositories: [model] }) } as unknown as T,
			})) as unknown as typeof original;
			repositories.getRepository = originalGetRepository;
			assert.strictEqual(getRepository(repo.path), model);
			assert.strictEqual(getRepository(repo.path + '/other'), undefined);
			assert.strictEqual(getRepository(repo.path + '-other'), undefined);
		} finally {
			vscode.extensions.getExtension = original;
		}
	});
});
