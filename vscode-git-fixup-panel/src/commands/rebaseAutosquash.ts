import * as vscode from 'vscode';
import {
	getRepository,
	getCommitLog,
	getRootCommitSha,
	runAutosquash,
} from '../git/repository';

const REBASE_BUTTON = 'Rebase now';

export async function rebaseAutosquashCommand(): Promise<void> {
	const repo = getRepository();
	if (!repo) {
		vscode.window.showErrorMessage('Gitリポジトリが見つかりません。');
		return;
	}

	// 作業ツリー・インデックス・マージ中のいずれかに変更がある場合はrebaseを行わない
	if (
		repo.state.workingTreeChanges.length > 0 ||
		repo.state.indexChanges.length > 0 ||
		repo.state.mergeChanges.length > 0
	) {
		vscode.window.showWarningMessage(
			'作業ツリーまたはインデックスに変更があるか、マージが進行中です。コミットまたはスタッシュし、マージを完了または中止してからrebaseしてください。'
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

	// ルートコミットはrebase対象にできないため除外する
	let rootSha: string;
	try {
		rootSha = await getRootCommitSha(repoPath);
	} catch (err) {
		vscode.window.showErrorMessage(`ルートコミットの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
		return;
	}
	const commitsForRebase = commits.filter(c => c.sha !== rootSha);
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

	const shortSha = selected.sha.slice(0, 7);
	const answer = await vscode.window.showWarningMessage(
		`${shortSha} から HEAD まで autosquash rebase を実行しますか？`,
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
