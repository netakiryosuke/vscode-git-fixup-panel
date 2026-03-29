/**
 * VSCode組み込みgit拡張機能の型定義
 * 参考: https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts
 */

export interface GitExtension {
	readonly enabled: boolean;
	readonly onDidChangeEnablement: unknown;
	getAPI(version: 1): API;
}

export interface API {
	readonly repositories: Repository[];
	readonly onDidOpenRepository: unknown;
	readonly onDidCloseRepository: unknown;
}

export interface Repository {
	readonly rootUri: import('vscode').Uri;
	readonly inputBox: InputBox;
	readonly state: RepositoryState;
	commit(message: string, opts?: CommitOptions): Promise<void>;
}

export interface InputBox {
	value: string;
}

export interface RepositoryState {
	readonly HEAD: Branch | undefined;
	readonly indexChanges: Change[];
	readonly workingTreeChanges: Change[];
	readonly mergeChanges: Change[];
}

export interface Branch {
	readonly type: RefType;
	readonly name?: string;
	readonly commit?: string;
	readonly upstream?: UpstreamRef;
}

export interface UpstreamRef {
	readonly remote: string;
	readonly name: string;
}

export interface Change {
	readonly uri: import('vscode').Uri;
	readonly originalUri: import('vscode').Uri;
	readonly renameUri: import('vscode').Uri | undefined;
	readonly status: Status;
}

export interface CommitOptions {
	all?: boolean | 'tracked';
	amend?: boolean;
	signoff?: boolean;
	signCommit?: boolean;
	empty?: boolean;
	noVerify?: boolean;
	requireUserConfig?: boolean;
	useEditor?: boolean;
	verbose?: boolean;
	postCommitCommand?: string | null;
}

export const enum RefType {
	Head,
	RemoteHead,
	Tag,
}

export const enum Status {
	INDEX_MODIFIED,
	INDEX_ADDED,
	INDEX_DELETED,
	INDEX_RENAMED,
	INDEX_COPIED,
	MODIFIED,
	DELETED,
	UNTRACKED,
	IGNORED,
	INTENT_TO_ADD,
	INTENT_TO_RENAME,
	ADDED_BY_US,
	ADDED_BY_THEM,
	DELETED_BY_US,
	DELETED_BY_THEM,
	BOTH_ADDED,
	BOTH_DELETED,
	BOTH_MODIFIED,
}
