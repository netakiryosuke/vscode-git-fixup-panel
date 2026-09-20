import * as assert from 'assert';
import * as vscode from 'vscode';
import { pickRebaseCommit } from '../commands/pickRebaseCommit';
import { CommitEntry } from '../git/repository';

function entry(index: number): CommitEntry {
	const sha = index.toString(16).padStart(40, '0');
	return { sha, label: `commit ${index}`, description: sha.slice(0, 7) };
}

suite('Rebase Commit Picker Test Suite', () => {
	let originalCreateQuickPick: typeof vscode.window.createQuickPick;
	let accepted: vscode.EventEmitter<void>;
	let hidden: vscode.EventEmitter<void>;
	let picker: vscode.QuickPick<CommitEntry>;
	let shown: boolean;
	let disposed: boolean;
	const commits = Array.from({ length: 20 }, (_, index) => entry(index + 1));

	setup(() => {
		originalCreateQuickPick = vscode.window.createQuickPick;
		accepted = new vscode.EventEmitter<void>();
		hidden = new vscode.EventEmitter<void>();
		shown = false;
		disposed = false;
		picker = {
			items: [], activeItems: [], selectedItems: [],
			onDidAccept: accepted.event,
			onDidHide: hidden.event,
			show: () => { shown = true; },
			dispose: () => { disposed = true; hidden.fire(); },
		} as unknown as vscode.QuickPick<CommitEntry>;
		vscode.window.createQuickPick = <T extends vscode.QuickPickItem>() =>
			picker as unknown as vscode.QuickPick<T>;
	});

	teardown(() => {
		vscode.window.createQuickPick = originalCreateQuickPick;
		accepted.dispose();
		hidden.dispose();
	});

	test('highlights the inferred item without reordering or duplicating existing items', async () => {
		const selection = pickRebaseCommit(commits, { ...commits[10] });
		assert.ok(shown);
		assert.deepStrictEqual(picker.items, commits);
		assert.strictEqual(picker.activeItems[0], commits[10]);
		assert.strictEqual(picker.matchOnDescription, true);
		picker.selectedItems = picker.activeItems;
		accepted.fire();
		assert.strictEqual(await selection, commits[10]);
		assert.ok(disposed);
	});

	test('adds only the inferred older commit beyond the normal 20 items', async () => {
		const older = entry(100);
		const selection = pickRebaseCommit(commits, older);
		assert.deepStrictEqual(picker.items, [...commits, older]);
		assert.deepStrictEqual(picker.activeItems, [older]);
		assert.strictEqual(commits.length, 20);
		picker.selectedItems = [older];
		accepted.fire();
		assert.strictEqual(await selection, older);
	});

	test('keeps the first item active when inference produces no suggestion', async () => {
		const selection = pickRebaseCommit(commits, undefined);
		assert.deepStrictEqual(picker.items, commits);
		assert.deepStrictEqual(picker.activeItems, [commits[0]]);
		picker.selectedItems = [commits[0]];
		accepted.fire();
		assert.strictEqual(await selection, commits[0]);
	});

	test('accepts the user selection instead of forcing the suggestion', async () => {
		const selection = pickRebaseCommit(commits, commits[10]);
		picker.selectedItems = [commits[2]];
		accepted.fire();
		assert.strictEqual(await selection, commits[2]);
	});

	test('cancels without accepting the highlighted item', async () => {
		const selection = pickRebaseCommit(commits, commits[10]);
		hidden.fire();
		assert.strictEqual(await selection, undefined);
		assert.ok(disposed);
	});

	test('does not accept a stale active item when filtering leaves no selection', async () => {
		const selection = pickRebaseCommit(commits, commits[10]);
		picker.selectedItems = [];
		accepted.fire();
		assert.ok(!disposed);
		hidden.fire();
		assert.strictEqual(await selection, undefined);
	});
});

suite('Rebase Commit Picker UI Test Suite', () => {
	test('accepts the initially highlighted suggestion in the VS Code picker', async function () {
		const uiTimeoutMs = 10_000;
		this.timeout(uiTimeoutMs);
		const originalCreateQuickPick = vscode.window.createQuickPick;
		let picker: vscode.QuickPick<vscode.QuickPickItem> | undefined;
		let activeSubscription: vscode.Disposable | undefined;
		const ready = new Promise<void>(resolve => {
			vscode.window.createQuickPick = <T extends vscode.QuickPickItem>() => {
				const created = originalCreateQuickPick<T>();
				picker = created;
				activeSubscription = created.onDidChangeActive(() => resolve());
				return created;
			};
		});
		try {
			const commits = [entry(1), entry(2), entry(3)];
			const selection = pickRebaseCommit(commits, commits[1]);
			await ready;
			assert.strictEqual(picker?.activeItems[0], commits[1]);
			await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
			assert.strictEqual(await selection, commits[1]);
		} finally {
			vscode.window.createQuickPick = originalCreateQuickPick;
			activeSubscription?.dispose();
			picker?.hide();
			picker?.dispose();
		}
	});
});
