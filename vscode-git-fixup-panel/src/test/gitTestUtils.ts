import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { getGitExecutable } from '../git/repository';

const execFileAsync = promisify(execFile);
const TEST_GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

export interface TestRepository {
	readonly path: string;
	dispose(): Promise<void>;
}

export async function runGit(repoPath: string, args: string[]): Promise<string> {
	const { stdout } = await execFileAsync(getGitExecutable(), args, {
		cwd: repoPath,
		env: TEST_GIT_ENV,
	});
	return stdout;
}

export async function createTestRepository(prefix = 'git-fixup-test-'): Promise<TestRepository> {
	const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

	try {
		// Production currently parses SHA-1 object names, so keep the fixture independent of user defaults.
		await runGit(repoPath, ['init', '--quiet', '--object-format=sha1']);

		const hooksPath = path.join(repoPath, '.git', 'test-hooks');
		await fs.mkdir(hooksPath, { recursive: true });

		await runGit(repoPath, ['config', 'user.name', 'Git Fixup Panel Test']);
		await runGit(repoPath, ['config', 'user.email', 'git-fixup-panel@example.invalid']);
		await runGit(repoPath, ['config', 'commit.gpgsign', 'false']);
		await runGit(repoPath, ['config', 'core.autocrlf', 'false']);
		await runGit(repoPath, ['config', 'core.hooksPath', hooksPath]);
		await runGit(repoPath, ['config', 'core.quotepath', 'false']);
		await runGit(repoPath, ['config', 'rebase.autostash', 'false']);
		await runGit(repoPath, ['config', 'rerere.enabled', 'false']);
	} catch (err) {
		await fs.rm(repoPath, { recursive: true, force: true });
		throw err;
	}

	return {
		path: repoPath,
		dispose: () => fs.rm(repoPath, { recursive: true, force: true }),
	};
}

export async function writeFile(repoPath: string, relativePath: string, content: string): Promise<void> {
	const filePath = path.join(repoPath, relativePath);
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content);
}

export async function commitAll(repoPath: string, message: string): Promise<string> {
	await runGit(repoPath, ['add', '-A', '--', '.']);
	await runGit(repoPath, ['commit', '--quiet', '-m', message]);
	return (await runGit(repoPath, ['rev-parse', 'HEAD'])).trim();
}
