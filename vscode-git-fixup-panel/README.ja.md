# Git Fixup Panel

**fixup コミットの作成と autosquash rebase を VS Code から GUI ベースで直接実行。**

## 概要

Git Fixup Panel は、Source Control パネルに 2 つのコマンドを追加します。

1. **Create Fixup Commit** — ステージ済みの変更をもとに、修正対象のコミットを選ぶだけで `git commit --fixup` を実行。そのまま autosquash rebase まで一気に行うことも可能です。
2. **Rebase Autosquash** — `git rebase -i --autosquash` をエディタなしで非インタラクティブに実行。ターミナルに戻る必要はありません。

どちらのコマンドも SCM パネルのタイトルバーボタンとコマンドパレットから呼び出せます。

## 機能

### Create Fixup Commit

変更をステージしたあと、直近 20 件のコミットからクイックピックで修正対象を選択するだけで `fixup!` コミットを作成します。作成後、そのまま autosquash rebase を実行するか後回しにするかを選択できます。

![fixup](https://github.com/user-attachments/assets/5cb60d4f-abaf-4b6d-a60e-c2fa99f2dfc4)

### Rebase Autosquash

ベースコミットを選択すると、`git rebase -i --autosquash <sha>^` をエディタなしで実行します。`fixup!` / `squash!` コミットが自動的に整理されます。

![Autosquash](https://github.com/user-attachments/assets/692d6432-d053-4284-9d12-73c92bad1f56)

### SCM パネルボタン

両コマンドは Source Control パネルのタイトルバーにアイコンボタンとして表示されます。コマンドパレットを開かずに操作できます。

<img width="640" height="476" alt="Book xlsx - Google Chrome 2026_03_30 3_20_38" src="https://github.com/user-attachments/assets/ea4b0544-9964-447b-8f7b-725a1facb7e1" />

## 使い方

### Create Fixup Commit

1. 修正内容を編集し、`git add`（または VS Code の「変更をステージ」ボタン）でステージします。
2. SCM パネルのタイトルバーにある **コミットアイコン**（$(git-commit)）をクリック、またはコマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）から **Git Fixup: Create Fixup Commit** を実行します。
3. 一覧から修正対象のコミットを選択します。
4. `fixup!` コミットが作成されます。続けて autosquash rebase を実行するか確認ダイアログが表示されます。**Rebase now** または **Later** を選択してください。

### Rebase Autosquash

1. 作業ツリーをクリーンにします（未コミット変更・マージ進行中の状態では実行できません）。
2. SCM パネルのタイトルバーにある **fold アイコン**（$(fold)）をクリック、またはコマンドパレットから **Git Fixup: Rebase Autosquash** を実行します。
3. ベースコミットを選択します（そのコミットから `HEAD` までが rebase 対象になります）。
4. rebase がサイレントに完了します。インタラクティブエディタは開きません。

## 要件

- **Git** がインストールされていること。VS Code の `git.path` 設定でカスタムパスを指定している場合はその設定が使用されます。
- **VS Code** バージョン `1.110.0` 以上。

## 拡張機能の設定

本拡張機能独自の設定項目はありません。以下の VS Code 組み込み設定を参照します。

| 設定 | 説明 |
|------|------|
| `git.path` | Git 実行ファイルのパス。未設定の場合は `PATH` 上の `git` を使用します。 |

## 既知の制限

- コミット一覧は **直近 20 件** のみ表示されます。それより古いコミットは選択できません。
- rebase は完全に非インタラクティブです。コンフリクトが発生すると rebase は中断され、ターミナルでの手動解決が必要です。
- リポジトリにコミットが 1 件以上必要です。

## リリースノート

### 0.0.1

- 初回リリース。
- **Create Fixup Commit**: GUI ベースの `git commit --fixup` 操作。
- **Rebase Autosquash**: 非インタラクティブな `git rebase -i --autosquash` 操作。
- マルチルートワークスペース対応。
- `git.path` VS Code 設定に対応。

## フィードバック・コントリビュート

Issue や Pull Request は [GitHub](https://github.com/netakiryosuke/vscode-git-fixup-panel) から。

> English documentation is available at [README.md](README.md).
