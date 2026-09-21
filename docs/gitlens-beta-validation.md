# GitLens Beta validation

The integration in Issue #16 targets GitLens Commit Graph, in both the editor and sidebar. GitLens tree views and other graph extensions are outside this Beta's scope.

## Automated checks

Run from `vscode-git-fixup-panel/`:

```sh
npm run compile
npm run lint
xvfb-run -a npm test # Linux; use npm test on Windows/macOS
```

Tests cover GitLens context parsing, registered-command dispatch into real Git operations, explicit repository selection, older commits, invalid/other-branch targets, staging behavior, cancellation of the regular picker, commit failure, and the post-fixup rebase setting. GitLens need not be installed to run these tests.

The context fixtures follow GitLens v19.2.0:

- [Commit row context](https://github.com/gitkraken/vscode-gitlens/blob/v19.2.0/src/webviews/apps/plus/graph/utils/rowContext.utils.ts)
- [Reference format](https://github.com/gitkraken/vscode-gitlens/blob/v19.2.0/packages/git/src/utils/reference.utils.ts)

## Manual smoke test before publishing

Use disposable repositories and a VS Code profile with this development extension and GitLens. Access to GitLens Commit Graph may require signing in; a signed-out GitLens 19.2.0 profile displayed an account gate during validation. Do not treat the context fixture tests as verification of GitLens's actual UI.

1. Open Commit Graph in the editor. Modify a tracked file and right-click a commit in the current HEAD history. Confirm **Create Fixup Commit — Git Fixup Panel (Beta)** appears in its own group, separated from GitLens actions by a divider, without a submenu.
2. Run the action. Confirm there is no commit picker, the new subject is `fixup! <selected subject>`, and the existing rebase prompt appears. Choose **Later**.
3. Repeat from the sidebar graph, then with `vscode-git-fixup-panel.promptRebaseAfterFixup` disabled. Confirm the prompt is omitted.
4. Stage one change and leave another unstaged. Confirm only the staged change enters the fixup. With nothing staged, confirm all working tree changes enter it.
5. Open two repositories. Keep an editor from repository A active while selecting a commit in repository B's graph. Confirm only B's history/index changes.
6. Select a commit older than 20 entries. Confirm it is used directly.
7. Check another-branch commits, stash/uncommitted rows, multiple selected commits, and secondary worktree HEAD rows. The action must not be offered. Open a worktree as the graph's selected repository to use its own history.
8. Disable GitLens and reload. Confirm the original Source Control buttons and commands still work.

## Branch and release flow

- Integration target: `release/gitlens-beta`.
- Implementation PRs target that branch; CI runs for `release/**` as well as `main`.
- After merging and validating, a tag such as `v0.4.0-beta` on the release branch publishes Marketplace version `0.4.0` as Pre-Release and a GitHub pre-release.
- Each publication needs a distinct numeric version across both channels. Stable versions higher than the current Beta can also update Pre-Release users; publish a newer Beta first when preserving the integration during a stable release.
- The release branch and tag must both exist on the remote before publication. The workflow rejects Beta commits already contained in `main`.
