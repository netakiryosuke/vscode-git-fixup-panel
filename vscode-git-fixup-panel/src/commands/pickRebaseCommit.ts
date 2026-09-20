import * as vscode from 'vscode';
import { CommitEntry } from '../git/repository';

export function pickRebaseCommit(
	commits: readonly CommitEntry[],
	suggested: CommitEntry | undefined,
): Promise<CommitEntry | undefined> {
	return new Promise(resolve => {
		const picker = vscode.window.createQuickPick<CommitEntry>();
		const items = [...commits];
		let active = suggested && items.find(item => item.sha === suggested.sha);
		if (suggested && !active) {
			items.push(suggested);
			active = suggested;
		}
		picker.items = items;
		picker.placeholder = 'Select a base commit for autosquash rebase';
		picker.matchOnDescription = true;
		picker.activeItems = active ? [active] : items.slice(0, 1);

		const subscriptions: vscode.Disposable[] = [];
		const finish = (selected?: CommitEntry) => {
			subscriptions.forEach(subscription => subscription.dispose());
			picker.dispose();
			resolve(selected);
		};
		subscriptions.push(
			picker.onDidAccept(() => {
				const selected = picker.selectedItems[0];
				if (selected) {
					finish(selected);
				}
			}),
			picker.onDidHide(() => finish()),
		);
		picker.show();
	});
}
