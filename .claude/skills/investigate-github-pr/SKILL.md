---
name: investigate-github-pr
description: GitHub PRの一覧と詳細を調査し、変更内容を分析する
user-invocable: true
allowed-tools: Bash(gh *)
---

GitHub リポジトリの PR 一覧を取得し、各 PR の変更内容を分析してレポートを出力してください。

引数としてリポジトリ名を受け取ります。オプションでブランチ、取得件数、PR の状態も指定できます。

## 使用例

```text
/investigate-github-pr repo=<org>/claude-code-lambda-workshop limit=5
```

## 引数

- `repo`（必須）: 対象リポジトリ。`owner/repo`形式で指定
- `branch`（任意）: 対象ブランチ。省略時は全ブランチを対象とする
- `limit`（任意）: 取得件数。デフォルト 10
- `state`（任意）: PR の状態（open / closed / merged / all）。デフォルト merged

## ステップ 1: PR 一覧の取得

以下のコマンドで PR 一覧を JSON 形式で取得してください。

```bash
gh pr list --repo owner/repo --state merged --limit 10 --json number,title,author,mergedAt,headRefName,url
```

`--state merged`が非対応の場合は、以下の代替コマンドを使用してください。

```bash
gh pr list --repo owner/repo --state closed --search "is:merged" --limit 10 --json number,title,author,mergedAt,headRefName,url
```

branch が指定された場合は`--base`オプションを付与してください。

```bash
gh pr list --repo owner/repo --state merged --base main --limit 10 --json number,title,author,mergedAt,headRefName,url
```

## ステップ 2: PR 詳細の取得

各 PR の本文、レビュー、変更ファイルを取得してください。

```bash
gh pr view <number> --repo owner/repo --json body,reviews,files,comments
```

重要な PR や変更ファイル数が多い PR を優先的に確認してください。

## ステップ 3: 差分の確認

変更内容の詳細把握が必要な場合、差分を取得してください。

```bash
gh pr diff <number> --repo owner/repo
```

差分が大規模な場合は、主要なファイルに絞って確認してください。

## ステップ 4: レポート出力

以下のフォーマットで結果を出力してください。

```md
## PR 調査レポート

- **リポジトリ:** owner/repo
- **対象:** state PRs（branch 指定がある場合はブランチ名を記載）
- **取得件数:** N 件
- **調査日:** YYYY-MM-DD

### PR 一覧

| #   | タイトル | 作者   | マージ日時 | ブランチ    |
| --- | -------- | ------ | ---------- | ----------- |
| 123 | PR title | author | YYYY-MM-DD | feature/xxx |

### 注目 PR 詳細

#### #123 PR title

- **変更ファイル:** N files (+X, -Y)
- **主な変更ファイル:** file1, file2, ...
- **レビューコメント:** N 件
- **影響範囲:** 影響範囲の説明

**変更概要:**
変更内容の要約

### 所見

- 全体的な変更の傾向
- 注目すべきパターンやリスク
- 推奨事項
```

### 出力ルール

- PR 一覧はマージ日時の降順で表示する
- 変更ファイル数やレビューコメント数が多い PR を「注目 PR」として詳細を記載する
- 差分の要約は変更の意図が伝わるよう簡潔にまとめる
- レビューコメントは重要なものを抜粋する
- 所見にはリポジトリ全体の変更傾向や注目点を記載する
