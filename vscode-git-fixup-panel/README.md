# Git Fixup Panel

**A VS Code extension for creating fixup commits and running autosquash rebase through a GUI — right from the Source Control panel.**

## What is this?

Git Fixup Panel adds two focused commands to your Source Control panel:

1. **Create Fixup Commit** — stage your changes, pick the commit to amend, and the extension runs `git commit --fixup` for you. Optionally kick off an autosquash rebase on the spot.
2. **Rebase Autosquash** — run `git rebase -i --autosquash` non-interactively against any commit in your recent history, with no editor window interrupting your flow.

Both commands are accessible from the Source Control panel title bar buttons and the Command Palette.

## Features

### GitLens Commit Graph integration (Beta)

This branch adds an experimental **Create Fixup Commit — Git Fixup Panel (Beta)** action to a separate group in the right-click menu of a single commit in GitLens Commit Graph (editor or sidebar). It uses that commit directly, including commits older than 20 entries, without opening the commit picker.

The commit must belong to the current `HEAD` history in the graph's selected local repository, which must also be open in VS Code's built-in Git extension. Changes are committed in that repository, regardless of the active editor. Existing staged changes are used as-is; when nothing is staged, all working tree changes are staged automatically. The post-fixup rebase prompt follows the existing setting.

GitLens is optional and is not installed automatically. The usual Source Control buttons and Command Palette commands still work without it. This integration is maintained on `release/gitlens-beta`, separately from the stable version. Once published, use **Switch to Pre-Release Version** in the extension's VS Code page to try it.

The adapter follows GitLens 19.2.0's internal graph context format, not a guaranteed public API. Multiple selections, uncommitted/stash rows, other-branch commits, secondary worktree HEAD rows, virtual repositories, and GitLens tree views are not supported. Git Graph and VS Code's built-in graph are not covered by this Beta. To work in another worktree, open it as the graph's repository.

### Create Fixup Commit

Stage your changes, then pick which commit to fix up from a quick-pick list of your recent 20 commits. A `fixup!` commit is created instantly. After creation you can choose to run the autosquash rebase immediately or defer it.

![fixup (2)](https://github.com/user-attachments/assets/bb4a13b1-c97c-4a94-ad67-be064fc0885d)

### Rebase Autosquash

Select a base commit and the extension runs `git rebase -i --autosquash <sha>^` without opening an editor. All pending `fixup!` and `squash!` commits are folded in automatically.

The picker checks the most recent 20 commits for `fixup!` / `squash!` messages. When every target can be identified by an exact, unique subject match in a linear history, the oldest target commit is highlighted initially. Targets can be older than 20 commits; an inferred target outside the normal list is added as one extra item. You can select another commit or press Esc to cancel. Accepting a commit starts the rebase immediately, with no additional confirmation dialog. The separate prompt after Create Fixup Commit is still controlled by `vscode-git-fixup-panel.promptRebaseAfterFixup`.

Target lookup has no commit-count limit, but stops after two seconds. If lookup fails or a target is ambiguous or unsupported, the first item stays highlighted as before. The 20-commit scan limit applies only to the suggestion: autosquash still processes the selected rebase range.

![Autosquash (1)](https://github.com/user-attachments/assets/8f7948fc-a47e-406e-9c90-e62d4a93851c)

### Source Control Panel Buttons

Both commands appear as icon buttons in the Source Control panel title bar so you can reach them without opening the Command Palette.

<img width="640" height="476" alt="Book xlsx - Google Chrome 2026_03_30 3_20_38" src="https://github.com/user-attachments/assets/21020ca1-be92-474c-bc9f-ff0e9678d956" />

## Getting Started

### Create Fixup Commit

1. Make your edits. If you have staged changes, they will be used as-is. If nothing is staged, all working tree changes are staged automatically.
2. Click the **commit icon** ($(git-commit)) in the Source Control panel title bar, or open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Git Fixup: Create Fixup Commit**.
3. Select the commit you want to amend from the list.
4. A `fixup!` commit is created. By default, you will be asked whether to run autosquash rebase immediately — choose **Rebase now** or **Later**. You can disable this prompt in the extension settings.

### Rebase Autosquash

1. Make sure your working tree is clean (no uncommitted changes, no merge in progress).
2. Click the **fold icon** ($(fold)) in the Source Control panel title bar, or run **Git Fixup: Rebase Autosquash** from the Command Palette.
3. Review the suggested commit, if available, or choose another base commit. Press Enter to start the rebase from that commit (inclusive) up to `HEAD`, or press Esc to cancel.
4. The rebase starts without an additional confirmation dialog or an interactive editor.

## Requirements

- **Git** must be installed. The extension respects the `git.path` setting in VS Code, so custom Git locations are supported.
- **VS Code** `1.110.0` or newer.

## Extension Settings

This extension provides a setting for the post-fixup workflow and respects the built-in Git setting below:

| Setting | Description |
|---------|-------------|
| `vscode-git-fixup-panel.promptRebaseAfterFixup` | Whether to prompt for an autosquash rebase after creating a fixup commit. Defaults to `true`. |
| `git.path` | Path to the Git executable. Falls back to `git` on `PATH` if not set. |

## Known Limitations

- The commit picker shows up to **20 recent commits**. Rebase Autosquash can additionally show one inferred older target. The scan and display counts are not configurable.
- Automatic suggestions require exact, unique target subjects. Hash references, subject prefixes, nested fixups, `amend!` messages, root targets, merges within the proposed range, and shallow history fall back to manual selection.
- The rebase is fully non-interactive. If conflicts occur, you can open the conflicting files directly from the error notification and resolve them, or abort the rebase with one click.
- The extension requires at least one commit in the repository.

## Release Notes

### 0.3.0

- **Autosquash base suggestions**: Rebase Autosquash now checks the most recent 20 commits for `fixup!` / `squash!` messages and preselects the oldest target when all targets can be identified uniquely. An inferred target older than the normal list is added to the picker. Ambiguous targets or a lookup timeout fall back to manual selection.
- **Streamlined rebase flow**: Accepting a commit now starts the rebase without an additional confirmation dialog. The picker explains the rebase range and the Enter / Esc actions. The separate post-fixup rebase prompt and its setting are unchanged.

### 0.2.0

- **Optional post-fixup rebase prompt**: Added the `vscode-git-fixup-panel.promptRebaseAfterFixup` setting. Disable it to create fixup commits without being prompted to run an autosquash rebase. The default value is `true` to preserve the existing behavior.
- **Test and CI coverage**: Expanded Git integration test coverage and added macOS to the CI matrix alongside Windows and Linux.

### 0.1.1

- Fix an issue where autosquash rebase failed on Windows.

### 0.1.0

- **Auto-stage on fixup**: If no files are staged when running Create Fixup Commit, all working tree changes are staged automatically. The stage is rolled back if the commit is cancelled or fails.
- **Conflict UX for autosquash rebase**: When a rebase conflict occurs, conflicting files are listed in the notification and opened directly in the editor. A one-click **Abort Rebase** button is also provided.
- **UI language**: All user-facing messages are now in English.

### 0.0.5

- Update dependencies.

### 0.0.4

- Update README GIFs to better illustrate the workflow.

### 0.0.3

- Fix release pipeline: `package.json` version is now automatically synced from the git tag before publishing.

### 0.0.2

- Add LICENSE file to the extension package for correct Marketplace display.

### 0.0.1

- Initial release.
- **Create Fixup Commit**: GUI-driven `git commit --fixup`.
- **Rebase Autosquash**: Non-interactive `git rebase -i --autosquash`.
- Multi-root workspace support.
- Respects `git.path` VS Code setting.

## Feedback & Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/netakiryosuke/vscode-git-fixup-panel).

> 日本語ドキュメントは [README.ja.md](https://github.com/netakiryosuke/vscode-git-fixup-panel/blob/main/vscode-git-fixup-panel/README.ja.md) をご覧ください。
