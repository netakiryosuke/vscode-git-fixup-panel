import { execFile, spawn } from 'child_process';
import { createInterface } from 'readline';
import { promisify } from 'util';
import { CommitEntry, getGitExecutable } from './repository';

const execFileAsync = promisify(execFile);
const INFERENCE_TIMEOUT_MS = 2_000;
const AUTOSQUASH_SUBJECT = /^(fixup|squash|amend)! (.*)$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;

export async function inferAutosquashBase(
	repoPath: string,
	recentCommits: readonly CommitEntry[],
	timeoutMs = INFERENCE_TIMEOUT_MS,
): Promise<CommitEntry | undefined> {
	const pending = new Map<string, string>();
	for (const commit of recentCommits) {
		const match = AUTOSQUASH_SUBJECT.exec(commit.label);
		if (!match) {
			continue;
		}
		// Restrict suggestions to plain subjects to avoid duplicating Git's full matching rules.
		if (match[1] === 'amend' || !match[2] || AUTOSQUASH_SUBJECT.test(match[2])) {
			return undefined;
		}
		pending.set(commit.sha, match[2]);
	}
	if (pending.size === 0 || timeoutMs <= 0) {
		return undefined;
	}

	const head = recentCommits[0].sha;
	if (!SHA_PATTERN.test(head)) {
		return undefined;
	}
	const git = getGitExecutable();
	const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
	const deadline = Date.now() + timeoutMs;
	try {
		const { stdout } = await execFileAsync(git, ['rev-parse', '--is-shallow-repository'], {
			cwd: repoPath, env, timeout: timeoutMs,
		});
		// Incomplete history cannot establish whether a subject is unique.
		if (stdout.trim() !== 'false') {
			return undefined;
		}
	} catch {
		return undefined;
	}
	const remainingMs = deadline - Date.now();
	if (remainingMs <= 0) {
		return undefined;
	}

	const subjects = new Set(pending.values());
	const targets = new Map<string, CommitEntry>();
	let oldest: CommitEntry | undefined;
	let hasMerge = false;
	// Use the list's HEAD snapshot and ancestry order, regardless of commit timestamps.
	const child = spawn(git, [
		'log', '--topo-order', '--no-decorate', '--no-show-signature',
		'--format=%H%x00%P%x00%s', head, '--',
	], { cwd: repoPath, env, timeout: remainingMs, stdio: ['ignore', 'pipe', 'ignore'] });
	const completed = new Promise<boolean>(resolve => {
		child.once('error', () => resolve(false));
		child.once('close', (code, signal) => resolve(code === 0 && signal === null));
	});
	const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
	try {
		// Keep memory bounded by retaining only subjects referenced by recent fixups.
		for await (const line of lines) {
			if (Date.now() >= deadline) {
				return undefined;
			}
			const fields = line.split('\0');
			const [sha, parentField, subject] = fields;
			if (fields.length !== 3 || !SHA_PATTERN.test(sha)) {
				return undefined;
			}
			const parents = parentField ? parentField.split(' ') : [];
			if (parents.some(parent => !SHA_PATTERN.test(parent))) {
				return undefined;
			}
			pending.delete(sha);
			hasMerge ||= parents.length > 1;
			if (!subjects.has(subject)) {
				continue;
			}
			if (
				targets.has(subject) || parents.length !== 1 || hasMerge ||
				[...pending.values()].includes(subject)
			) {
				return undefined;
			}
			oldest = { sha, label: subject, description: sha.slice(0, 7) };
			targets.set(subject, oldest);
		}
		// Read to the end even after finding targets to rule out older duplicate subjects.
		if (!await completed || pending.size !== 0 || targets.size !== subjects.size) {
			return undefined;
		}
		return oldest;
	} catch {
		return undefined;
	} finally {
		lines.close();
		if (child.exitCode === null && child.signalCode === null) {
			child.kill();
		}
		await completed;
	}
}
