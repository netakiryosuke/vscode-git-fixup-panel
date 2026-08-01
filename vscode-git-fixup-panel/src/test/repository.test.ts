import * as assert from 'assert';
import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { runAutosquash } from '../git/repository';

const execFileAsync = promisify(execFile);
const TEST_TIMEOUT_MS = 30_000;

async function runGit(repoPath: string, args: string[]): Promise<string> {
	const { stdout } = await execFileAsync('git', args, { cwd: repoPath });
	return stdout;
}

suite('Git Repository Test Suite', () => {
	test('runAutosquash folds a fixup commit into the selected commit', async function () {
		this.timeout(TEST_TIMEOUT_MS);

		const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'git-fixup-autosquash-'));
		const testFilePath = path.join(repoPath, 'example.txt');

		try {
			await runGit(repoPath, ['init', '--quiet']);
			await runGit(repoPath, ['config', 'user.name', 'Git Fixup Panel Test']);
			await runGit(repoPath, ['config', 'user.email', 'git-fixup-panel@example.invalid']);
			await runGit(repoPath, ['config', 'commit.gpgsign', 'false']);
			await runGit(repoPath, ['config', 'core.autocrlf', 'false']);

			await fs.writeFile(testFilePath, 'root\n');
			await runGit(repoPath, ['add', 'example.txt']);
			await runGit(repoPath, ['commit', '--quiet', '-m', 'root']);

			await fs.writeFile(testFilePath, 'target\n');
			await runGit(repoPath, ['add', 'example.txt']);
			await runGit(repoPath, ['commit', '--quiet', '-m', 'target']);
			const targetSha = (await runGit(repoPath, ['rev-parse', 'HEAD'])).trim();

			await fs.writeFile(testFilePath, 'fixed\n');
			await runGit(repoPath, ['add', 'example.txt']);
			await runGit(repoPath, ['commit', '--quiet', `--fixup=${targetSha}`]);

			await runAutosquash(targetSha, repoPath);

			const subjects = (await runGit(repoPath, ['log', '--format=%s']))
				.trim()
				.split(/\r?\n/);
			assert.deepStrictEqual(subjects, ['target', 'root']);
			assert.strictEqual(await fs.readFile(testFilePath, 'utf8'), 'fixed\n');
			assert.strictEqual((await runGit(repoPath, ['status', '--porcelain'])).trim(), '');
		} finally {
			await fs.rm(repoPath, { recursive: true, force: true });
		}
	});
});
