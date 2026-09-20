import * as vscode from 'vscode';
import { CommitEntry } from '../git/repository';

const PICKER_TITLE = 'Rebase Autosquash';
const PICKER_PLACEHOLDER = 'Press Enter to rebase from the selected commit (inclusive) to HEAD, or Esc to cancel';

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
		picker.title = PICKER_TITLE;
		picker.placeholder = PICKER_PLACEHOLDER;
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
