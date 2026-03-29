import * as vscode from 'vscode';
import {
	getRepository,
	getCommitLog,
	getRootCommitSha,
	runGitFixup,
	runAutosquash,
} from '../git/repository';

const REBASE_BUTTON = 'Rebase now';

export async function fixupCommand(): Promise<void> {
	const repo = getRepository();
	if (!repo) {
		vscode.window.showErrorMessage('Gitリポジトリが見つかりません。');
		return;
	}

	if (repo.state.indexChanges.length === 0) {
		vscode.window.showWarningMessage(
			'ステージ済みの変更がありません。git add でファイルをステージしてください。'
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

	const selected = await vscode.window.showQuickPick(commits, {
		placeHolder: 'fixupするコミットを選択してください',
		matchOnDescription: true,
	});

	if (!selected) {
		return;
	}

	try {
		await runGitFixup(selected.sha, repoPath);
		vscode.window.showInformationMessage(
			`fixupコミットを作成しました: ${selected.description} ${selected.label}`
		);
	} catch (err) {
		vscode.window.showErrorMessage(`git commit --fixup の実行に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
		return;
	}

	// 選択コミットがルートコミットの場合はautosquash提案をスキップする（rebaseできないため）
	let rootSha: string;
	try {
		rootSha = await getRootCommitSha(repoPath);
	} catch {
		return;
	}
	if (selected.sha === rootSha) {
		return;
	}

	const answer = await vscode.window.showWarningMessage(
		`autosquash rebase を今すぐ実行しますか？ (対象: ${selected.description}^..HEAD)`,
		REBASE_BUTTON,
		'Later'
	);

	if (answer === REBASE_BUTTON) {
		if (repo.state.workingTreeChanges.length > 0) {
			vscode.window.showWarningMessage(
				'作業ツリーに変更があります。コミットまたはスタッシュしてからrebaseしてください。'
			);
			return;
		}
		try {
			await runAutosquash(selected.sha, repoPath);
			vscode.window.showInformationMessage('autosquash rebase が完了しました。');
		} catch (err) {
			vscode.window.showErrorMessage(`git rebase --autosquash の実行に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
}
