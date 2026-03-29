# Git Fixup Panel

**A VS Code extension for creating fixup commits and running autosquash rebase through a GUI — right from the Source Control panel.**

## What is this?

Git Fixup Panel adds two focused commands to your Source Control panel:

1. **Create Fixup Commit** — stage your changes, pick the commit to amend, and the extension runs `git commit --fixup` for you. Optionally kick off an autosquash rebase on the spot.
2. **Rebase Autosquash** — run `git rebase -i --autosquash` non-interactively against any commit in your recent history, with no editor window interrupting your flow.

Both commands are accessible from the Source Control panel title bar buttons and the Command Palette.

## Features

### Create Fixup Commit

Stage your changes, then pick which commit to fix up from a quick-pick list of your recent 20 commits. A `fixup!` commit is created instantly. After creation you can choose to run the autosquash rebase immediately or defer it.

![fixup](https://github.com/user-attachments/assets/d154a020-a9da-4701-a25e-eec785fc7246)

### Rebase Autosquash

Select a base commit and the extension runs `git rebase -i --autosquash <sha>^` without opening an editor. All pending `fixup!` and `squash!` commits are folded in automatically.

![Autosquash](https://github.com/user-attachments/assets/2f17d6e0-7d9f-4488-84a1-a7b23bc392c2)

### Source Control Panel Buttons

Both commands appear as icon buttons in the Source Control panel title bar so you can reach them without opening the Command Palette.

<img width="640" height="476" alt="Book xlsx - Google Chrome 2026_03_30 3_20_38" src="https://github.com/user-attachments/assets/21020ca1-be92-474c-bc9f-ff0e9678d956" />

## Getting Started

### Create Fixup Commit

1. Make your edits and stage them with `git add` (or VS Code's Stage Changes button).
2. Click the **commit icon** ($(git-commit)) in the Source Control panel title bar, or open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Git Fixup: Create Fixup Commit**.
3. Select the commit you want to amend from the list.
4. A `fixup!` commit is created. You will be asked whether to run autosquash rebase immediately — choose **Rebase now** or **Later**.

### Rebase Autosquash

1. Make sure your working tree is clean (no uncommitted changes, no merge in progress).
2. Click the **fold icon** ($(fold)) in the Source Control panel title bar, or run **Git Fixup: Rebase Autosquash** from the Command Palette.
3. Select the base commit — the rebase will apply from that commit up to `HEAD`.
4. The rebase runs silently and completes without opening an interactive editor.

## Requirements

- **Git** must be installed. The extension respects the `git.path` setting in VS Code, so custom Git locations are supported.
- **VS Code** `1.110.0` or newer.

## Extension Settings

This extension does not add its own settings. It reads the following built-in VS Code setting:

| Setting | Description |
|---------|-------------|
| `git.path` | Path to the Git executable. Falls back to `git` on `PATH` if not set. |

## Known Limitations

- The commit picker shows up to **20 recent commits**. Older commits are not listed.
- The rebase is fully non-interactive — conflicts will abort the rebase and must be resolved manually via the terminal.
- The extension requires at least one commit in the repository.

## Release Notes

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

> 日本語ドキュメントは [README.ja.md](README.ja.md) をご覧ください。
