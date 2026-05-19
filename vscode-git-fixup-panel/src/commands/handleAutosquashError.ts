import * as path from 'path';
import * as vscode from 'vscode';
import { getConflictFiles, runGitRebaseAbort } from '../git/repository';

const RESOLVE_BUTTON = 'Resolve Conflicts';
const ABORT_BUTTON = 'Abort Rebase';
const MAX_CONFLICT_FILE_DISPLAY = 3;

async function abortRebase(repoPath: string): Promise<void> {
	try {
		await runGitRebaseAbort(repoPath);
		vscode.window.showInformationMessage('Rebase aborted.');
	} catch (abortErr) {
		vscode.window.showErrorMessage(`Failed to run git rebase --abort: ${abortErr instanceof Error ? abortErr.message : String(abortErr)}`);
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
		vscode.window.showErrorMessage(`Failed to run git rebase --autosquash: ${err instanceof Error ? err.message : String(err)}`);
		return;
	}

	const displayed = conflictFiles.slice(0, MAX_CONFLICT_FILE_DISPLAY).join(', ');
	const extra = conflictFiles.length > MAX_CONFLICT_FILE_DISPLAY
		? ` and ${conflictFiles.length - MAX_CONFLICT_FILE_DISPLAY} more`
		: '';
	const fileInfo = `${displayed}${extra}`;

	const answer = await vscode.window.showErrorMessage(
		`Conflicts detected (${fileInfo}).`,
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
