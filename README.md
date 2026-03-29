# Git Fixup Panel

**Create fixup commits and run autosquash rebase — without leaving VS Code.**

A VS Code extension that adds GUI-driven `git commit --fixup` and non-interactive `git rebase -i --autosquash` to your Source Control panel.

## Documentation

- 📄 [Extension README (English)](vscode-git-fixup-panel/README.md) — full usage guide, also shown on the VS Code Marketplace
- 📄 [Extension README (日本語)](vscode-git-fixup-panel/README.ja.md)

## Features

- **Create Fixup Commit** — stage changes, pick a commit from the quick-pick list, done.
- **Rebase Autosquash** — fold all pending `fixup!` / `squash!` commits in one click, no editor window.
- SCM panel title bar buttons for quick access.
- Multi-root workspace support.
- Respects VS Code's `git.path` setting.

## Development

```bash
cd vscode-git-fixup-panel
npm install
npm run compile
```

Open in VS Code and press `F5` to launch the Extension Development Host.
