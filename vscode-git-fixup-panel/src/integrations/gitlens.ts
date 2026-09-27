import * as path from 'path';
import * as vscode from 'vscode';
import { createFixup, FixupTarget } from '../commands/fixup';

const GRAPH_VIEWS = new Set(['gitlens.graph', 'gitlens.views.graph']);
const COMMIT_CONTEXT = /^gitlens:commit(?:\+[\w]+)*$/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseGitLensTarget(context: unknown): FixupTarget | undefined {
	// GitLens's webview payload is not a public API; reject unsupported shapes rather than guessing.
	if (!isRecord(context) || typeof context.webview !== 'string' || !GRAPH_VIEWS.has(context.webview)
		|| typeof context.webviewItem !== 'string' || !COMMIT_CONTEXT.test(context.webviewItem)
		|| context.listMultiSelection === true) {
		return undefined;
	}
	const flags = context.webviewItem.split('+').slice(1);
	if (!flags.includes('current') || flags.includes('worktreeHEAD')) {
		return undefined;
	}
	const value = context.webviewItemValue;
	if (!isRecord(value) || value.type !== 'commit' || !isRecord(value.ref)) {
		return undefined;
	}
	const ref = value.ref;
	if (ref.refType !== 'revision' || typeof ref.ref !== 'string' || !COMMIT_SHA.test(ref.ref)
		|| typeof ref.repoPath !== 'string' || !path.isAbsolute(ref.repoPath)
		|| ref.repoPath.includes('\0')) {
		return undefined;
	}
	// Secondary worktree rows can carry a different path from the graph's active repository.
	if (value.worktreePath !== undefined && value.worktreePath !== ref.repoPath) {
		return undefined;
	}
	return { repoPath: ref.repoPath, sha: ref.ref };
}

export async function gitlensFixupCommand(context: unknown): Promise<void> {
	const target = parseGitLensTarget(context);
	if (!target) {
		vscode.window.showWarningMessage('Select a single commit in the current HEAD history in GitLens Commit Graph.');
		return;
	}
	await createFixup(target);
}
