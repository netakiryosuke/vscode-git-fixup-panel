import * as vscode from 'vscode';
import {
	getRepository,
	getCommitLog,
	runAutosquash,
} from '../git/repository';

const REBASE_BUTTON = 'Rebase now';

export async function rebaseAutosquashCommand(): Promise<void> {
	const repo = getRepository();
	if (!repo) {
		vscode.window.showErrorMessage('Gitリポジトリが見つかりません。');
		return;
	}

	const repoPath = repo.rootUri.fsPath;
	let commits;
	try {
		commits = getCommitLog(repoPath);
	} catch (err) {
		vscode.window.showErrorMessage(`コミットログの取得に失敗しました: ${err}`);
		return;
	}

	if (commits.length === 0) {
		vscode.window.showErrorMessage('コミット履歴が見つかりません。');
		return;
	}

	const selected = await vscode.window.showQuickPick(commits, {
		placeHolder: 'autosquash rebase の対象コミットを選択してください',
		matchOnDescription: true,
	});

	if (!selected) {
		return;
	}

	const answer = await vscode.window.showWarningMessage(
		`${selected.description} の前までautosquash rebaseを実行しますか？`,
		REBASE_BUTTON,
		'Cancel'
	);

	if (answer === REBASE_BUTTON) {
		await runAutosquash(selected.sha, repoPath);
	}
}
