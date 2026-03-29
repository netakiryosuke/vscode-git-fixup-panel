import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { GitExtension, Repository } from '../types/git';

const execFileAsync = promisify(execFile);

const COMMIT_LOG_COUNT = 20;
// SHA-1は40桁の16進数
const SHA_PATTERN = /^[0-9a-f]{40}$/;

const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

// vscode.git の git.path 設定を尊重する。未設定なら PATH 上の git を使う
function getGitExecutable(): string {
	return vscode.workspace.getConfiguration('git').get<string>('path') || 'git';
}

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
	if (!git) {
		return undefined;
	}
	// マルチルートワークスペース対応: アクティブエディタのURIに一致するリポジトリを優先する
	const activeUri = vscode.window.activeTextEditor?.document.uri;
	if (activeUri) {
		const matched = git.repositories.find(repo => {
			const rootPath = repo.rootUri.fsPath;
			return activeUri.fsPath === rootPath || activeUri.fsPath.startsWith(rootPath + path.sep);
		});
		if (matched) {
			return matched;
		}
	}
	// 一致しない場合は最初のリポジトリにフォールバック
	return git.repositories[0];
}

export async function getCommitLog(repoPath: string): Promise<CommitEntry[]> {
	const { stdout } = await execFileAsync(
		getGitExecutable(),
		['log', '--pretty=format:%H %s', `-${COMMIT_LOG_COUNT}`],
		{ cwd: repoPath, env: GIT_ENV }
	);

	return stdout.trim().split('\n').filter(Boolean).flatMap(line => {
		const sha = line.slice(0, 40);
		const message = line.slice(41);
		if (!SHA_PATTERN.test(sha)) {
			return [];
		}
		return [{ sha, label: message, description: sha.slice(0, 7) }];
	});
}

export async function runGitFixup(sha: string, cwd: string): Promise<void> {
	await execFileAsync(getGitExecutable(), ['commit', `--fixup=${sha}`], { cwd, env: GIT_ENV });
}

export async function runAutosquash(sha: string, repoPath: string): Promise<void> {
	// Windows では : がコマンドとして解決できないため cmd /c exit 0 を使う
	const sequenceEditor = process.platform === 'win32' ? 'cmd /c exit 0' : ':';
	// GIT_SEQUENCE_EDITOR でエディタを起動せず非インタラクティブに実行する
	await execFileAsync(getGitExecutable(), ['rebase', '-i', '--autosquash', `${sha}^`], {
		cwd: repoPath,
		env: { ...GIT_ENV, GIT_SEQUENCE_EDITOR: sequenceEditor },
	});
}

export async function getRootCommitSha(repoPath: string): Promise<string> {
	const { stdout } = await execFileAsync(
		getGitExecutable(),
		['rev-list', '--max-parents=0', 'HEAD'],
		{ cwd: repoPath, env: GIT_ENV }
	);
	return stdout.trim();
}
