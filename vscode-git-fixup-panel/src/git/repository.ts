import * as vscode from 'vscode';
import { execFileSync, execFile } from 'child_process';
import { promisify } from 'util';
import { GitExtension, Repository } from '../types/git';

const execFileAsync = promisify(execFile);

const COMMIT_LOG_COUNT = 20;
// SHA-1は40桁の16進数
const SHA_PATTERN = /^[0-9a-f]{40}$/;

const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

export interface CommitEntry extends vscode.QuickPickItem {
	sha: string;
}

export function getRepository(): Repository | undefined {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
	// enabled未チェックのままgetAPIを呼ぶと無効状態で予期しない値が返る
	if (!gitExtension?.enabled) {
		return undefined;
	}
	const git = gitExtension.getAPI(1);
	return git?.repositories[0];
}

export function getCommitLog(repoPath: string): CommitEntry[] {
	const output = execFileSync(
		'git',
		['log', '--pretty=format:%H %s', `-${COMMIT_LOG_COUNT}`],
		{ cwd: repoPath, env: GIT_ENV }
	).toString();

	return output.trim().split('\n').filter(Boolean).flatMap(line => {
		const sha = line.slice(0, 40);
		const message = line.slice(41);
		if (!SHA_PATTERN.test(sha)) {
			return [];
		}
		return [{ sha, label: message, description: sha.slice(0, 7) }];
	});
}

export function runGitFixup(sha: string, cwd: string): void {
	execFileSync('git', ['commit', `--fixup=${sha}`], { cwd, env: GIT_ENV });
}

export async function runAutosquash(sha: string, repoPath: string): Promise<void> {
	try {
		// GIT_SEQUENCE_EDITOR=: でエディタを起動せず非インタラクティブに実行する
		await execFileAsync('git', ['rebase', '-i', '--autosquash', `${sha}^`], {
			cwd: repoPath,
			env: { ...GIT_ENV, GIT_SEQUENCE_EDITOR: ':' },
		});
		vscode.window.showInformationMessage('autosquash rebase が完了しました。');
	} catch (err) {
		vscode.window.showErrorMessage(`git rebase --autosquash の実行に失敗しました: ${err}`);
	}
}
