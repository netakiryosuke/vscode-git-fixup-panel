import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { GitExtension, Repository } from '../types/git';

const COMMIT_LOG_COUNT = 20;

export interface CommitEntry extends vscode.QuickPickItem {
	sha: string;
}

export function getRepository(): Repository | undefined {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
	const git = gitExtension?.getAPI(1);
	return git?.repositories[0];
}

export function getCommitLog(repoPath: string): CommitEntry[] {
	const output = execSync(
		`git log --pretty=format:"%H %s" -${COMMIT_LOG_COUNT}`,
		{ cwd: repoPath }
	).toString();

	return output.trim().split('\n').filter(Boolean).map(line => {
		const sha = line.slice(0, 40);
		const message = line.slice(41);
		return {
			sha,
			label: message,
			description: sha.slice(0, 7),
		};
	});
}

export function runGitCommand(command: string, cwd: string): string {
	return execSync(command, {
		cwd,
		// git認証プロンプトを抑制する
		env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
	}).toString().trim();
}

export async function runAutosquash(sha: string, repoPath: string): Promise<void> {
	try {
		// GIT_SEQUENCE_EDITOR=: でエディタを起動せず非インタラクティブに実行する
		execSync(`git rebase -i --autosquash ${sha}^`, {
			cwd: repoPath,
			env: {
				...process.env,
				GIT_SEQUENCE_EDITOR: ':',
				GIT_TERMINAL_PROMPT: '0',
			},
		});
		vscode.window.showInformationMessage('autosquash rebase が完了しました。');
	} catch (err) {
		vscode.window.showErrorMessage(`git rebase --autosquash の実行に失敗しました: ${err}`);
	}
}
