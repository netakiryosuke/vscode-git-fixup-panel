import * as vscode from 'vscode';
import { getConflictFiles, runGitRebaseAbort } from '../git/repository';

const ABORT_BUTTON = 'Abort Rebase';
const OPEN_SCM_BUTTON = 'ソース管理を開く';
const MAX_CONFLICT_FILE_DISPLAY = 3;

async function abortRebase(repoPath: string): Promise<void> {
	try {
		await runGitRebaseAbort(repoPath);
		vscode.window.showInformationMessage('rebase を中止しました。');
	} catch (abortErr) {
		vscode.window.showErrorMessage(`git rebase --abort に失敗しました: ${abortErr instanceof Error ? abortErr.message : String(abortErr)}`);
	}
}

export async function handleAutosquashError(err: unknown, repoPath: string): Promise<void> {
	// locale非依存なコンフリクト判定: unmerged pathが存在するかで判断する
	let conflictFiles: string[] = [];
	try {
		conflictFiles = await getConflictFiles(repoPath);
	} catch {
		// ファイル取得に失敗した場合はコンフリクトではないと判断し、通常エラーとして扱う
	}

	if (conflictFiles.length === 0) {
		vscode.window.showErrorMessage(`git rebase --autosquash の実行に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
		return;
	}

	const displayed = conflictFiles.slice(0, MAX_CONFLICT_FILE_DISPLAY).join(', ');
	const extra = conflictFiles.length > MAX_CONFLICT_FILE_DISPLAY
		? ` 他${conflictFiles.length - MAX_CONFLICT_FILE_DISPLAY}件`
		: '';
	const fileInfo = `${displayed}${extra}`;

	const answer = await vscode.window.showErrorMessage(
		`コンフリクトが発生しました (${fileInfo})。手動で解消するか rebase を中止してください。`,
		ABORT_BUTTON,
		OPEN_SCM_BUTTON
	);

	if (answer === ABORT_BUTTON) {
		await abortRebase(repoPath);
	} else if (answer === OPEN_SCM_BUTTON) {
		await vscode.commands.executeCommand('workbench.view.scm');
		// SCMを開いた後もAbortの選択肢を残す
		const followUp = await vscode.window.showWarningMessage(
			'コンフリクトを解消後、git rebase --continue を実行してください。',
			ABORT_BUTTON
		);
		if (followUp === ABORT_BUTTON) {
			await abortRebase(repoPath);
		}
	}
}
