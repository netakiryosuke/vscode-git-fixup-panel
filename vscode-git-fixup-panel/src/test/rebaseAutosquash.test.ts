import * as assert from 'assert';
import * as vscode from 'vscode';
import { rebaseAutosquashCommand } from '../commands/rebaseAutosquash';
import { CommitEntry } from '../git/repository';
import { commitAll, createTestRepository, runGit, TestRepository, writeFile } from './gitTestUtils';

const gitRepository = require('../git/repository') as typeof import('../git/repository');
const commitPicker = require('../commands/pickRebaseCommit') as typeof import('../commands/pickRebaseCommit');
const TEST_TIMEOUT_MS = 60_000;

suite('Rebase Autosquash Command Test Suite', function () {
	this.timeout(TEST_TIMEOUT_MS);
	const originalGetRepository = gitRepository.getRepository;
	const originalPickRebaseCommit = commitPicker.pickRebaseCommit;
	const originalWarning = vscode.window.showWarningMessage;
	const originalInformation = vscode.window.showInformationMessage;
	const originalError = vscode.window.showErrorMessage;
	let repo: TestRepository;
	let target: CommitEntry;
	let originalHead: string;
	let pickerOpened: Promise<void>;
	let resolveSelection: (selected: CommitEntry | undefined) => void;
	let command: Promise<void> | undefined;
	let suggestion: CommitEntry | undefined;
	let warnings: string[];
	let information: string[];
	let errors: string[];

	setup(async () => {
		command = undefined;
		suggestion = undefined;
		warnings = [];
		information = [];
		errors = [];
		repo = await createTestRepository();
		await writeFile(repo.path, 'example.txt', 'root\n');
		await commitAll(repo.path, 'root');
		await writeFile(repo.path, 'example.txt', 'target\n');
		const sha = await commitAll(repo.path, 'target');
		target = { sha, label: 'target', description: sha.slice(0, 7) };
		await writeFile(repo.path, 'example.txt', 'fixed\n');
		await runGit(repo.path, ['add', 'example.txt']);
		await gitRepository.runGitFixup(sha, repo.path);
		originalHead = (await runGit(repo.path, ['rev-parse', 'HEAD'])).trim();

		gitRepository.getRepository = () => ({
			rootUri: vscode.Uri.file(repo.path),
			inputBox: { value: '' },
			state: { HEAD: undefined, workingTreeChanges: [], indexChanges: [], mergeChanges: [] },
			commit: async () => undefined,
		});
		const selection = new Promise<CommitEntry | undefined>(resolve => { resolveSelection = resolve; });
		pickerOpened = new Promise<void>(resolve => {
			commitPicker.pickRebaseCommit = (_commits, suggested) => {
				suggestion = suggested;
				resolve();
				return selection;
			};
		});
		vscode.window.showWarningMessage = async (message: string) => {
			warnings.push(message);
			return undefined;
		};
		vscode.window.showInformationMessage = async (message: string) => {
			information.push(message);
			return undefined;
		};
		vscode.window.showErrorMessage = async (message: string) => {
			errors.push(message);
			return undefined;
		};
	});

	teardown(async () => {
		try {
			resolveSelection?.(undefined);
			await command;
		} finally {
			gitRepository.getRepository = originalGetRepository;
			commitPicker.pickRebaseCommit = originalPickRebaseCommit;
			vscode.window.showWarningMessage = originalWarning;
			vscode.window.showInformationMessage = originalInformation;
			vscode.window.showErrorMessage = originalError;
			await repo?.dispose();
		}
	});

	test('waits for selection, then rebases without another confirmation', async () => {
		command = rebaseAutosquashCommand();
		await pickerOpened;
		assert.strictEqual(suggestion?.sha, target.sha);
		assert.strictEqual((await runGit(repo.path, ['rev-parse', 'HEAD'])).trim(), originalHead);
		assert.deepStrictEqual(information, []);

		resolveSelection(target);
		await command;
		assert.deepStrictEqual(warnings, []);
		assert.deepStrictEqual(errors, []);
		assert.deepStrictEqual(information, ['Autosquash rebase completed.']);
		assert.deepStrictEqual((await runGit(repo.path, ['log', '--format=%s'])).trim().split('\n'), ['target', 'root']);
		assert.strictEqual(await runGit(repo.path, ['show', 'HEAD:example.txt']), 'fixed\n');
	});

	test('leaves history untouched when the picker is cancelled', async () => {
		command = rebaseAutosquashCommand();
		await pickerOpened;
		resolveSelection(undefined);
		await command;
		assert.strictEqual((await runGit(repo.path, ['rev-parse', 'HEAD'])).trim(), originalHead);
		assert.deepStrictEqual(warnings, []);
		assert.deepStrictEqual(information, []);
		assert.deepStrictEqual(errors, []);
	});

	test('reports a rebase failure without showing a success notification', async () => {
		command = rebaseAutosquashCommand();
		await pickerOpened;
		resolveSelection({ ...target, sha: '0'.repeat(40) });
		await command;
		assert.strictEqual((await runGit(repo.path, ['rev-parse', 'HEAD'])).trim(), originalHead);
		assert.deepStrictEqual(warnings, []);
		assert.deepStrictEqual(information, []);
		assert.strictEqual(errors.length, 1);
		assert.match(errors[0], /Failed to run git rebase --autosquash:/);
	});
});
