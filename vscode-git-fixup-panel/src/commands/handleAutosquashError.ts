import * as path from 'path';
import * as vscode from 'vscode';
import { getConflictFiles, runGitRebaseAbort } from '../git/repository';

const RESOLVE_BUTTON = 'コンフリクトを解消する';
const ABORT_BUTTON = 'Abort Rebase';
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
		`コンフリクトが発生しました (${fileInfo})。`,
		RESOLVE_BUTTON,
		ABORT_BUTTON
	);

	if (answer === RESOLVE_BUTTON) {
		// コンフリクトファイルをすべてエディタで開く
		for (const file of conflictFiles) {
			const uri = vscode.Uri.file(path.join(repoPath, file));
			await vscode.window.showTextDocument(uri, { preview: false });
		}
	} else if (answer === ABORT_BUTTON) {
		await abortRebase(repoPath);
	}
}
