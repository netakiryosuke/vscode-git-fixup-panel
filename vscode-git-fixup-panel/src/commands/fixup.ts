import * as vscode from 'vscode';
import {
	getRepository,
	getCommitLog,
	getRootCommitSha,
	runGitFixup,
	runGitAddAll,
	runGitRestoreStaged,
	runAutosquash,
} from '../git/repository';
import { handleAutosquashError } from './handleAutosquashError';

const REBASE_BUTTON = 'Rebase now';

export async function fixupCommand(): Promise<void> {
	const repo = getRepository();
	if (!repo) {
		vscode.window.showErrorMessage('No Git repository found.');
		return;
	}

	// マージ中はステージング操作が競合する恐れがあるため、fixup自体を阻止する
	if (repo.state.mergeChanges.length > 0) {
		vscode.window.showWarningMessage(
			'Unresolved merge conflicts exist. Resolve them before committing.'
		);
		return;
	}

	const hasIndex = repo.state.indexChanges.length > 0;
	const hasWorkingTree = repo.state.workingTreeChanges.length > 0;

	if (!hasIndex && !hasWorkingTree) {
		vscode.window.showWarningMessage('No staged changes or working tree changes found.');
		return;
	}

	// ステージ済みがない場合はコミット選択後に自動ステージングする
	const autoStage = !hasIndex;

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

	const selected = await vscode.window.showQuickPick(commits, {
		placeHolder: 'Select a commit to fixup',
		matchOnDescription: true,
	});

	if (!selected) {
		return;
	}

	if (autoStage) {
		try {
			await runGitAddAll(repoPath);
		} catch (err) {
			vscode.window.showErrorMessage(`git add failed: ${err instanceof Error ? err.message : String(err)}`);
			return;
		}
	}

	try {
		await runGitFixup(selected.sha, repoPath);
		vscode.window.showInformationMessage(
			`Created fixup! commit for ${selected.description}: ${selected.label}`
		);
	} catch (err) {
		// 自動ステージしたファイルを元に戻す
		if (autoStage) {
			await runGitRestoreStaged(repoPath).catch(() => undefined);
		}
		vscode.window.showErrorMessage(`Failed to run git commit --fixup: ${err instanceof Error ? err.message : String(err)}`);
		return;
	}

	// 選択コミットがルートコミットの場合はautosquash提案をスキップする（rebaseできないため）
	let rootShas: string[];
	try {
		rootShas = await getRootCommitSha(repoPath);
	} catch {
		return;
	}
	if (rootShas.length === 0 || rootShas.includes(selected.sha)) {
		return;
	}

	const answer = await vscode.window.showWarningMessage(
		`Run autosquash rebase now? (${selected.description}: ${selected.label})`,
		REBASE_BUTTON,
		'Later'
	);

	if (answer === REBASE_BUTTON) {
		if (repo.state.workingTreeChanges.length > 0 || repo.state.mergeChanges.length > 0) {
			vscode.window.showWarningMessage(
				'Working tree has changes or unresolved merge conflicts. Commit or stash your changes and resolve the merge before rebasing.'
			);
			return;
		}
		try {
			await runAutosquash(selected.sha, repoPath);
			vscode.window.showInformationMessage('Autosquash rebase completed.');
		} catch (err) {
			await handleAutosquashError(err, repoPath);
		}
	}
}
