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

	// 作業ツリーやインデックスに未コミットの変更がある場合はrebaseを行わない
	if (repo.state.workingTreeChanges.length > 0 || repo.state.indexChanges.length > 0) {
		vscode.window.showWarningMessage(
			'作業ツリーまたはインデックスに変更があります。コミットまたはスタッシュしてからrebaseしてください。'
		);
		return;
	}

	const repoPath = repo.rootUri.fsPath;
	let commits;
	try {
		commits = await getCommitLog(repoPath);
	} catch (err) {
		vscode.window.showErrorMessage(`コミットログの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
		return;
	}

	if (commits.length === 0) {
		vscode.window.showErrorMessage('コミット履歴が見つかりません。');
		return;
	}

	// 初回コミット（最古のコミット）はrebase対象にできないため除外する
	const commitsForRebase = commits.slice(0, -1);
	if (commitsForRebase.length === 0) {
		vscode.window.showErrorMessage('rebase可能なコミットがありません。コミットが1件以下です。');
		return;
	}

	const selected = await vscode.window.showQuickPick(commitsForRebase, {
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
		try {
			await runAutosquash(selected.sha, repoPath);
			vscode.window.showInformationMessage('autosquash rebase が完了しました。');
		} catch (err) {
			vscode.window.showErrorMessage(`git rebase --autosquash の実行に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
}
