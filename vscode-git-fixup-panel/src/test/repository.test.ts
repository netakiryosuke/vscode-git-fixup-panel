import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
	getCommitLog,
	getConflictFiles,
	getRootCommitSha,
	runAutosquash,
	runGitAddAll,
	runGitFixup,
	runGitRebaseAbort,
	runGitRestoreStaged,
} from '../git/repository';
import { commitAll, createTestRepository, runGit, writeFile } from './gitTestUtils';

const TEST_TIMEOUT_MS = 60_000;

function splitLines(output: string): string[] {
	return output.trim().split(/\r?\n/).filter(Boolean);
}

function splitNullDelimited(output: string): string[] {
	return output.split('\0').filter(Boolean);
}

suite('Git Repository Test Suite', function () {
	this.timeout(TEST_TIMEOUT_MS);

	test('runGitFixup creates a fixup commit for the selected commit', async () => {
		const repo = await createTestRepository('git-fixup-commit-');

		try {
			await writeFile(repo.path, 'example.txt', 'root\n');
			await commitAll(repo.path, 'root');

			await writeFile(repo.path, 'example.txt', 'target\n');
			const targetSha = await commitAll(repo.path, 'target');

			await writeFile(repo.path, 'example.txt', 'fixed\n');
			await runGit(repo.path, ['add', 'example.txt']);
			await runGitFixup(targetSha, repo.path);

			const subjects = splitLines(await runGit(repo.path, ['log', '--format=%s']));
			assert.deepStrictEqual(subjects, ['fixup! target', 'target', 'root']);
			assert.strictEqual(await runGit(repo.path, ['show', 'HEAD:example.txt']), 'fixed\n');
			assert.strictEqual((await runGit(repo.path, ['status', '--porcelain'])).trim(), '');
		} finally {
			await repo.dispose();
		}
	});

	test('runAutosquash folds a fixup commit into the selected commit', async function () {
		const repo = await createTestRepository('git-fixup-autosquash-');

		try {
			await writeFile(repo.path, 'example.txt', 'root\n');
			await commitAll(repo.path, 'root');

			await writeFile(repo.path, 'example.txt', 'target\n');
			const targetSha = await commitAll(repo.path, 'target');

			await writeFile(repo.path, 'example.txt', 'fixed\n');
			await runGit(repo.path, ['add', 'example.txt']);
			await runGitFixup(targetSha, repo.path);

			await runAutosquash(targetSha, repo.path);

			const subjects = splitLines(await runGit(repo.path, ['log', '--format=%s']));
			assert.deepStrictEqual(subjects, ['target', 'root']);
			assert.strictEqual(await fs.readFile(path.join(repo.path, 'example.txt'), 'utf8'), 'fixed\n');
			assert.strictEqual((await runGit(repo.path, ['status', '--porcelain'])).trim(), '');
		} finally {
			await repo.dispose();
		}
	});

	test('runGitAddAll and runGitRestoreStaged preserve working tree changes', async () => {
		const repo = await createTestRepository('git-fixup-staging-');
		const untrackedFile = 'new file 日本語.txt';

		try {
			await writeFile(repo.path, 'modified.txt', 'before\n');
			await writeFile(repo.path, 'deleted.txt', 'delete me\n');
			await commitAll(repo.path, 'root');

			await writeFile(repo.path, 'modified.txt', 'after\n');
			await writeFile(repo.path, untrackedFile, 'new\n');
			await fs.rm(path.join(repo.path, 'deleted.txt'));

			await runGitAddAll(repo.path);

			const stagedFiles = splitNullDelimited(
				await runGit(repo.path, ['diff', '--cached', '--name-only', '-z'])
			).sort();
			assert.deepStrictEqual(stagedFiles, ['deleted.txt', 'modified.txt', untrackedFile].sort());

			await runGitRestoreStaged(repo.path);

			assert.strictEqual(
				(await runGit(repo.path, ['diff', '--cached', '--name-only'])).trim(),
				''
			);
			assert.notStrictEqual((await runGit(repo.path, ['status', '--porcelain'])).trim(), '');
			assert.strictEqual(await fs.readFile(path.join(repo.path, 'modified.txt'), 'utf8'), 'after\n');
			assert.strictEqual(await fs.readFile(path.join(repo.path, untrackedFile), 'utf8'), 'new\n');
			await assert.rejects(fs.stat(path.join(repo.path, 'deleted.txt')));
		} finally {
			await repo.dispose();
		}
	});

	test('getCommitLog returns the newest 20 commits in order', async () => {
		const repo = await createTestRepository('git-fixup-log-');

		try {
			await writeFile(repo.path, 'history.txt', 'root\n');
			await commitAll(repo.path, 'commit 0');

			for (let index = 1; index <= 20; index += 1) {
				await runGit(repo.path, ['commit', '--quiet', '--allow-empty', '-m', `commit ${index}`]);
			}

			const commits = await getCommitLog(repo.path);
			const expectedMessages = Array.from(
				{ length: 20 },
				(_, index) => `commit ${20 - index}`
			);

			assert.strictEqual(commits.length, 20);
			assert.deepStrictEqual(commits.map(commit => commit.label), expectedMessages);
			assert.ok(commits.every(commit => /^[0-9a-f]{40}$/.test(commit.sha)));
		} finally {
			await repo.dispose();
		}
	});

	test('getRootCommitSha returns the repository root commit', async () => {
		const repo = await createTestRepository('git-fixup-root-');

		try {
			await writeFile(repo.path, 'history.txt', 'root\n');
			const rootSha = await commitAll(repo.path, 'root');
			await runGit(repo.path, ['commit', '--quiet', '--allow-empty', '-m', 'second']);

			assert.deepStrictEqual(await getRootCommitSha(repo.path), [rootSha]);
		} finally {
			await repo.dispose();
		}
	});

	test('getConflictFiles handles special paths and runGitRebaseAbort restores the branch', async () => {
		const repo = await createTestRepository('git-fixup-conflict-');
		const conflictFiles = ['conflict file.txt', '競合.txt'];

		try {
			for (const file of conflictFiles) {
				await writeFile(repo.path, file, 'base\n');
			}
			const baseSha = await commitAll(repo.path, 'base');

			for (const file of conflictFiles) {
				await writeFile(repo.path, file, 'upstream\n');
			}
			const upstreamSha = await commitAll(repo.path, 'upstream');

			await runGit(repo.path, ['checkout', '--quiet', '-b', 'topic', baseSha]);
			for (const file of conflictFiles) {
				await writeFile(repo.path, file, 'topic\n');
			}
			const topicSha = await commitAll(repo.path, 'topic');

			await assert.rejects(runGit(repo.path, ['rebase', upstreamSha]));
			assert.deepStrictEqual((await getConflictFiles(repo.path)).sort(), [...conflictFiles].sort());

			await runGitRebaseAbort(repo.path);

			assert.strictEqual((await runGit(repo.path, ['rev-parse', 'HEAD'])).trim(), topicSha);
			assert.strictEqual((await runGit(repo.path, ['status', '--porcelain'])).trim(), '');
			for (const file of conflictFiles) {
				assert.strictEqual(await fs.readFile(path.join(repo.path, file), 'utf8'), 'topic\n');
			}
		} finally {
			await repo.dispose();
		}
	});
});
