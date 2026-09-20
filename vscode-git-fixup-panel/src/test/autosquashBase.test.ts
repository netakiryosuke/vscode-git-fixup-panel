import * as assert from 'assert';
import * as path from 'path';
import { inferAutosquashBase } from '../git/inferAutosquashBase';
import { getCommitLog, runAutosquash, runGitFixup } from '../git/repository';
import { commitAll, createTestRepository, runGit, writeFile } from './gitTestUtils';

const TEST_TIMEOUT_MS = 60_000;
const RECENT_COMMIT_COUNT = 20;

async function commit(repoPath: string, subject: string): Promise<string> {
	await runGit(repoPath, ['commit', '--quiet', '--allow-empty', '-m', subject]);
	return (await runGit(repoPath, ['rev-parse', 'HEAD'])).trim();
}

async function infer(repoPath: string) {
	return inferAutosquashBase(repoPath, await getCommitLog(repoPath));
}

suite('Autosquash Base Inference Test Suite', function () {
	this.timeout(TEST_TIMEOUT_MS);

	test('selects the oldest target and folds multiple fixups into their respective commits', async () => {
		const repo = await createTestRepository();
		try {
			const root = await commit(repo.path, 'root');
			await writeFile(repo.path, 'first.txt', 'first\n');
			const first = await commitAll(repo.path, 'first target');
			await writeFile(repo.path, 'second.txt', 'second\n');
			const second = await commitAll(repo.path, 'second target');
			await writeFile(repo.path, 'second.txt', 'second fixed\n');
			await runGit(repo.path, ['add', '.']);
			await runGitFixup(second, repo.path);
			await writeFile(repo.path, 'first.txt', 'first fixed\n');
			await runGit(repo.path, ['add', '.']);
			await runGitFixup(first, repo.path);
			await writeFile(repo.path, 'second.txt', 'second fixed again\n');
			await runGit(repo.path, ['add', '.']);
			await runGitFixup(second, repo.path);

			const suggested = await infer(repo.path);
			assert.strictEqual(suggested?.sha, first);
			await runAutosquash(suggested!.sha, repo.path);
			assert.deepStrictEqual((await runGit(repo.path, ['log', '--format=%s'])).trim().split('\n'), [
				'second target', 'first target', 'root',
			]);
			assert.strictEqual((await runGit(repo.path, ['rev-parse', 'HEAD~2'])).trim(), root);
			assert.strictEqual(await runGit(repo.path, ['show', 'HEAD:first.txt']), 'first fixed\n');
			assert.strictEqual(await runGit(repo.path, ['show', 'HEAD:second.txt']), 'second fixed again\n');
		} finally {
			await repo.dispose();
		}
	});

	test('finds a target older than the 20 displayed commits and matches special characters literally', async () => {
		const repo = await createTestRepository();
		try {
			await commit(repo.path, 'root');
			const subject = '日本語 [target].* (validation)';
			const target = await commit(repo.path, subject);
			for (let i = 0; i < RECENT_COMMIT_COUNT; i++) {
				await commit(repo.path, `filler ${i}`);
			}
			await commit(repo.path, `fixup! ${subject}`);
			const recent = await getCommitLog(repo.path);
			assert.ok(!recent.some(entry => entry.sha === target));
			assert.deepStrictEqual(await inferAutosquashBase(repo.path, recent), {
				sha: target, label: subject, description: target.slice(0, 7),
			});
		} finally {
			await repo.dispose();
		}
	});

	test('ignores fixups outside the most recent 20 commits', async () => {
		const repo = await createTestRepository();
		try {
			await commit(repo.path, 'root');
			await commit(repo.path, 'fixup! missing old target');
			for (let i = 0; i < RECENT_COMMIT_COUNT - 2; i++) {
				await commit(repo.path, `filler ${i}`);
			}
			const target = await commit(repo.path, 'recent target');
			await commit(repo.path, 'fixup! recent target');
			assert.strictEqual((await infer(repo.path))?.sha, target);
		} finally {
			await repo.dispose();
		}
	});

	for (const [name, subjects] of [
		['no fixups', ['root', 'normal commit']],
		['missing target', ['root', 'target', 'fixup! target', 'fixup! missing']],
		['duplicate subjects', ['root', 'target', 'target', 'fixup! target']],
		['root target', ['root', 'fixup! root']],
		['target newer than fixup', ['root', 'fixup! target', 'target']],
		['subject prefix only', ['root', 'target with details', 'fixup! target']],
		['nested fixup', ['root', 'target', 'fixup! target', 'fixup! fixup! target']],
		['amend marker', ['root', 'target', 'fixup! target', 'amend! target']],
		['empty target subject', ['root', 'target', 'fixup! ']],
	] as const) {
		test(`falls back for ${name}`, async () => {
			const repo = await createTestRepository();
			try {
				for (const subject of subjects) {
					await commit(repo.path, subject);
				}
				assert.strictEqual(await infer(repo.path), undefined);
			} finally {
				await repo.dispose();
			}
		});
	}

	test('supports squash markers with exact subjects', async () => {
		const repo = await createTestRepository();
		try {
			await commit(repo.path, 'root');
			const target = await commit(repo.path, 'target');
			await commit(repo.path, 'squash! target');
			assert.strictEqual((await infer(repo.path))?.sha, target);
		} finally {
			await repo.dispose();
		}
	});

	test('falls back for hash references rather than partially resolving other fixups', async () => {
		const repo = await createTestRepository();
		try {
			await commit(repo.path, 'root');
			const target = await commit(repo.path, 'target');
			await commit(repo.path, 'fixup! target');
			await commit(repo.path, `fixup! ${target}`);
			assert.strictEqual(await infer(repo.path), undefined);
		} finally {
			await repo.dispose();
		}
	});

	for (const mergeInRange of [true, false]) {
		test(`${mergeInRange ? 'rejects' : 'allows'} a merge ${mergeInRange ? 'inside' : 'before'} the proposed range`, async () => {
			const repo = await createTestRepository();
			try {
				await commit(repo.path, 'root');
				const first = await commit(repo.path, 'first');
				const originalBranch = (await runGit(repo.path, ['branch', '--show-current'])).trim();
				await runGit(repo.path, ['checkout', '--quiet', '-b', 'side']);
				await commit(repo.path, 'side commit');
				await runGit(repo.path, ['checkout', '--quiet', originalBranch]);
				await commit(repo.path, 'main commit');
				await runGit(repo.path, ['merge', '--quiet', '--no-ff', 'side', '-m', 'merge']);
				const later = await commit(repo.path, 'later');
				await commit(repo.path, `fixup! ${mergeInRange ? 'first' : 'later'}`);
				assert.strictEqual((await infer(repo.path))?.sha, mergeInRange ? undefined : later);
				assert.notStrictEqual(first, later);
			} finally {
				await repo.dispose();
			}
		});
	}

	test('does not match a target that only exists on another branch', async () => {
		const repo = await createTestRepository();
		try {
			const root = await commit(repo.path, 'root');
			const originalBranch = (await runGit(repo.path, ['branch', '--show-current'])).trim();
			await runGit(repo.path, ['checkout', '--quiet', '-b', 'other']);
			await commit(repo.path, 'other target');
			await runGit(repo.path, ['checkout', '--quiet', originalBranch]);
			assert.strictEqual((await runGit(repo.path, ['rev-parse', 'HEAD'])).trim(), root);
			await commit(repo.path, 'fixup! other target');
			assert.strictEqual(await infer(repo.path), undefined);
		} finally {
			await repo.dispose();
		}
	});

	test('falls back on Git errors and exhausted time budgets', async () => {
		const repo = await createTestRepository();
		try {
			await commit(repo.path, 'root');
			await commit(repo.path, 'target');
			await commit(repo.path, 'fixup! target');
			const recent = await getCommitLog(repo.path);
			assert.strictEqual(await inferAutosquashBase(repo.path, recent, 0), undefined);
			assert.strictEqual(await inferAutosquashBase(repo.path, recent, 1), undefined);
			assert.strictEqual(await inferAutosquashBase(`${repo.path}/missing`, recent), undefined);
		} finally {
			await repo.dispose();
		}
	});

	test('falls back for shallow history even when the target is visible', async () => {
		const repo = await createTestRepository();
		try {
			await commit(repo.path, 'root');
			await commit(repo.path, 'parent');
			await commit(repo.path, 'target');
			await commit(repo.path, 'fixup! target');
			const shallowPath = path.join(repo.path, '.git', 'shallow-clone');
			await runGit(repo.path, ['clone', '--quiet', '--no-local', '--depth=3', repo.path, shallowPath]);
			const recent = await getCommitLog(shallowPath);
			assert.ok(recent.some(entry => entry.label === 'target'));
			assert.strictEqual(await inferAutosquashBase(shallowPath, recent), undefined);
		} finally {
			await repo.dispose();
		}
	});

	test('checks for duplicate targets beyond the recent commit window', async () => {
		const repo = await createTestRepository();
		try {
			await commit(repo.path, 'root');
			await commit(repo.path, 'target');
			for (let i = 0; i < RECENT_COMMIT_COUNT; i++) {
				await commit(repo.path, `filler ${i}`);
			}
			await commit(repo.path, 'target');
			await commit(repo.path, 'fixup! target');
			assert.strictEqual(await infer(repo.path), undefined);
		} finally {
			await repo.dispose();
		}
	});
});
