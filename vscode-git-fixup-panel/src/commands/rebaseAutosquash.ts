import * as vscode from 'vscode';
import {
	getRepository,
	getCommitLog,
	getRootCommitSha,
	runAutosquash,
} from '../git/repository';
import { handleAutosquashError } from './handleAutosquashError';

const REBASE_BUTTON = 'Rebase now';

export async function rebaseAutosquashCommand(): Promise<void> {
	const repo = getRepository();
	if (!repo) {
		vscode.window.showErrorMessage('No Git repository found.');
		return;
	}

	// 作業ツリー・インデックス・マージ中のいずれかに変更がある場合はrebaseを行わない
	if (
		repo.state.workingTreeChanges.length > 0 ||
		repo.state.indexChanges.length > 0 ||
		repo.state.mergeChanges.length > 0
	) {
		vscode.window.showWarningMessage(
			'Working tree or index has changes, or a merge is in progress. Commit or stash your changes and complete or abort the merge before rebasing.'
		);
		return;
	}

	const repoPath = repo.rootUri.fsPath;
	let commits;
	try {
		commits = await getCommitLog(repoPath);
	} catch (err) {
		vscode.window.showErrorMessage(`Failed to retrieve commit log: ${err instanceof Error ? err.message : String(err)}`);
		return;
	}

	if (commits.length === 0) {
		vscode.window.showErrorMessage('No commit history found.');
		return;
	}

	// ルートコミットはrebase対象にできないため除外する
	let rootShas: string[];
	try {
		rootShas = await getRootCommitSha(repoPath);
	} catch (err) {
		vscode.window.showErrorMessage(`Failed to retrieve root commit: ${err instanceof Error ? err.message : String(err)}`);
		return;
	}
	const commitsForRebase = commits.filter(c => !rootShas.includes(c.sha));
	if (commitsForRebase.length === 0) {
		vscode.window.showErrorMessage('No rebaseable commits. At least two commits are required.');
		return;
	}

	const selected = await vscode.window.showQuickPick(commitsForRebase, {
		placeHolder: 'Select a base commit for autosquash rebase',
		matchOnDescription: true,
	});

	if (!selected) {
		return;
	}

	const shortSha = selected.sha.slice(0, 7);
	const answer = await vscode.window.showWarningMessage(
		`Run autosquash rebase from ${shortSha}: ${selected.label} to HEAD?`,
		REBASE_BUTTON,
		'Cancel'
	);

	if (answer === REBASE_BUTTON) {
		try {
			await runAutosquash(selected.sha, repoPath);
			vscode.window.showInformationMessage('Autosquash rebase completed.');
		} catch (err) {
			await handleAutosquashError(err, repoPath);
		}
	}
}
