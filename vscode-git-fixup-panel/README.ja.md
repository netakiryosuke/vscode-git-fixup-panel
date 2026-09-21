# Git Fixup Panel

**Git の fixup コミット作成と autosquash rebase を、VS Code のソース管理パネルから GUI で操作できる拡張機能です。**

## 概要

Git Fixup Panel は、ソース管理パネルに 2 つのコマンドを追加します。

1. **Create Fixup Commit** — ステージ済みの変更をもとに、修正対象のコミットを選ぶだけで `git commit --fixup` を実行します。そのまま autosquash rebase まで続けて行うことも可能です。
2. **Rebase Autosquash** — `git rebase -i --autosquash` をエディタなしで非インタラクティブに実行します。ターミナルに戻る必要はありません。

どちらのコマンドも、ソース管理パネルのタイトルバーにあるボタンとコマンドパレットから呼び出せます。

## 機能

### GitLens Commit Graph 連携（Beta）

Pre-Release 版では、GitLens Commit Graph（エディタ／サイドバー）の単一コミットの右クリックメニューに、独立したグループとして実験的な **Create Fixup Commit — Git Fixup Panel (Beta)** を追加します。コミット選択画面を開かずにそのコミットを対象とするため、直近 20 件より古いコミットも指定できます。

対象は、グラフで選択中のローカルリポジトリの現在の `HEAD` に含まれるコミットです。そのリポジトリが VS Code 組み込み Git 拡張でも開かれている必要があります。アクティブなエディタにかかわらず、そのリポジトリで Fixup を作成します。ステージ済み変更があればそれだけを使用し、なければ作業ツリーの全変更を自動ステージングします。Fixup 後の Rebase 確認には既存設定が適用されます。

GitLens は任意で、自動インストールされません。未導入でも通常のソース管理ボタンとコマンドパレットは使用できます。この連携は安定版と分けて `release/beta` で管理します。公開後は VS Code の拡張機能ページで **Switch to Pre-Release Version** を選択して利用できます。

連携は GitLens 19.2.0 の内部的なグラフ情報形式に基づき、互換性が保証された公開 API ではありません。複数選択、未コミット／stash 行、別ブランチのコミット、別 worktree の HEAD 行、仮想リポジトリ、GitLens のツリー表示は対象外です。Git Graph と VS Code 標準グラフも今回の Beta には含みません。別 worktree で作業する場合は、その worktree をグラフのリポジトリとして開いてください。

### Create Fixup Commit

変更をステージしたあと、直近 20 件のコミットからクイックピックで修正対象を選択するだけで `fixup!` コミットを作成します。作成後、そのまま autosquash rebase を実行するか後回しにするかを選択できます。

![fixup (2)](https://github.com/user-attachments/assets/a1309957-cc38-4fef-97a7-42046e5609a8)

### Rebase Autosquash

ベースコミットを選択すると、`git rebase -i --autosquash <sha>^` をエディタなしで実行します。`fixup!` / `squash!` コミットが自動的に整理されます。

直近 20 件から `fixup!` / `squash!` コミットを検出し、すべての修正対象を件名の完全一致で一意に特定でき、対象までの履歴が直線的な場合は、最も古い対象コミットを初期選択します。対象が 20 件より古い場合は、そのコミットを候補に 1 件追加します。別のコミットへの変更や Esc でのキャンセルも可能です。コミットの選択を確定すると、追加の確認ダイアログなしで直ちに rebase を実行します。Create Fixup Commit 直後の確認は引き続き `vscode-git-fixup-panel.promptRebaseAfterFixup` の設定に従います。

修正対象の探索には件数制限を設けず、2 秒で打ち切ります。探索に失敗した場合や対象が曖昧・未対応の場合は、従来どおり先頭の候補を初期選択します。直近 20 件という制限は候補の推定だけに適用され、autosquash 自体は選択した rebase 範囲に対して実行されます。

![Autosquash (1)](https://github.com/user-attachments/assets/ac0ce138-d534-46bd-9dea-89e7e82e1c34)

### ソース管理パネルのボタン

両コマンドはソース管理パネルのタイトルバーにアイコンボタンとして表示されます。コマンドパレットを開かずに操作できます。

<img width="640" height="476" alt="Book xlsx - Google Chrome 2026_03_30 3_20_38" src="https://github.com/user-attachments/assets/ea4b0544-9964-447b-8f7b-725a1facb7e1" />

## 使い方

### Create Fixup Commit

1. 修正内容を編集します。ステージ済みの変更がある場合はそのまま使用されます。何もステージされていない場合は、作業ツリーの全変更が自動でステージングされます。
2. ソース管理パネルのタイトルバーにある **コミットアイコン**（$(git-commit)）をクリック、またはコマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）から **Git Fixup: Create Fixup Commit** を実行します。
3. 一覧から修正対象のコミットを選択します。
4. `fixup!` コミットが作成されます。既定では、続けて autosquash rebase を行うか確認するダイアログが表示されます。**Rebase now** または **Later** を選択してください。この確認は拡張機能の設定で無効化できます。

### Rebase Autosquash

1. 作業ツリーをクリーンにします（未コミット変更・マージ進行中の状態では実行できません）。
2. ソース管理パネルのタイトルバーにある **fold アイコン**（$(fold)）をクリック、またはコマンドパレットから **Git Fixup: Rebase Autosquash** を実行します。
3. 推奨候補があれば内容を確認するか、別のベースコミットを選択します。Enter でそのコミットを含む `HEAD` までの rebase を開始し、Esc でキャンセルします。
4. 追加の確認ダイアログやインタラクティブエディタを開かずに rebase を開始します。

## 要件

- **Git** がインストールされていること。VS Code の `git.path` 設定でカスタムパスを指定している場合はその設定が使用されます。
- **VS Code** バージョン `1.110.0` 以上。

## 拡張機能の設定

本拡張機能は fixup 後の動作を制御する設定を提供し、以下の VS Code 組み込み Git 設定も参照します。

| 設定 | 説明 |
|------|------|
| `vscode-git-fixup-panel.promptRebaseAfterFixup` | fixup コミット作成後に autosquash rebase の実行確認を表示するかどうか。既定値は `true` です。 |
| `git.path` | Git 実行ファイルのパス。未設定の場合は `PATH` 上の `git` を使用します。 |

## 既知の制限

- コミット一覧は **直近 20 件** を表示します。Rebase Autosquash では、推定した対象がそれより古い場合に 1 件追加します。探索件数・表示件数は設定で変更できません。
- 初期選択の提案は、修正対象の件名が完全一致し、一意に特定できる場合に限ります。SHA 指定、件名の前方一致、入れ子の fixup、`amend!`、ルートコミットが対象の場合、対象範囲内のマージ、浅い履歴（shallow clone）では手動選択に戻ります。
- rebase は完全に非インタラクティブです。コンフリクトが発生した場合は、通知からコンフリクトファイルを直接エディタで開いて解消できます。また、ワンクリックで rebase を中止することも可能です。
- リポジトリにコミットが 1 件以上必要です。

## リリースノート

### 0.3.0

- **autosquash のベースコミット推定**: Rebase Autosquash で直近 20 件の `fixup!` / `squash!` コミットを調べ、すべての修正対象を一意に特定できた場合に最も古い対象を初期選択します。対象が通常の一覧より古い場合は候補に追加し、対象が曖昧な場合や探索が時間切れになった場合は手動選択に戻ります。
- **rebase の操作を簡略化**: コミット選択の確定で、追加の確認ダイアログなしに rebase を開始するようにしました。選択画面に対象範囲と Enter / Esc の操作を明示しています。fixup 作成直後の rebase 確認とその設定は従来どおりです。

### 0.2.0

- **fixup 後の rebase 確認設定**: `vscode-git-fixup-panel.promptRebaseAfterFixup` 設定を追加しました。無効にすると、fixup コミット作成後に autosquash rebase の実行確認を表示しません。既存の動作を維持するため、既定値は `true` です。
- **テストと CI の拡充**: Git 統合テストを拡充し、Windows・Linux に加えて macOS を CI の対象に追加しました。

### 0.1.1

- Windows 環境で autosquash rebase が失敗する問題を修正しました。

### 0.1.0

- **fixup 時の自動ステージング**: Create Fixup Commit 実行時にステージ済みファイルがない場合、作業ツリーの全変更を自動でステージングします。コミットがキャンセルまたは失敗した場合はステージを元に戻します。
- **autosquash rebase のコンフリクト UX**: rebase でコンフリクトが発生した際、通知にコンフリクトファイルの一覧を表示し、ファイルをエディタで直接開くことができます。**Abort Rebase** ボタンでワンクリック中止も可能です。
- **UI 言語の統一**: ユーザー向けメッセージをすべて英語に統一しました。

### 0.0.5

- 依存関係のアップデートを行いました。

### 0.0.4

- README の GIF をより分かりやすいものに更新しました。

### 0.0.3

- リリースパイプラインの修正: git タグから `package.json` のバージョンを自動で同期するようにしました。

### 0.0.2

- 拡張機能パッケージに LICENSE ファイルを追加し、Marketplace での表示に対応しました。

### 0.0.1

- 初回リリース。
- **Create Fixup Commit**: GUI ベースの `git commit --fixup` 操作。
- **Rebase Autosquash**: 非インタラクティブな `git rebase -i --autosquash` 操作。
- マルチルートワークスペース対応。
- `git.path` VS Code 設定に対応。

## フィードバック・コントリビュート

Issue や Pull Request は [GitHub](https://github.com/netakiryosuke/vscode-git-fixup-panel) から。

> English documentation is available at [README.md](https://github.com/netakiryosuke/vscode-git-fixup-panel/blob/main/vscode-git-fixup-panel/README.md).
