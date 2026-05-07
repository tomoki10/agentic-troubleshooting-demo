---
name: investigate-incident
description: CloudWatch LogsとGitHub PRの調査結果を統合して障害レポートを生成する
user-invocable: true
allowed-tools: Bash(aws logs *), Bash(gh *)
---

CloudWatch Logs のエラーログと GitHub PR の変更履歴を統合的に調査し、障害レポートを生成してください。

## 使用例

```text
/investigate-incident repo=<org>/agentic-troubleshooting-demo log_group=/aws/lambda/workshop-demo-fn time_range=60 --profile workshop
```

## 引数

- `repo`（必須）: 調査対象リポジトリ（`owner/repo`形式）
- `log_group`（任意）: CloudWatch Logs のロググループ名。省略時はロググループ一覧を表示し、ユーザーに選択を促す
- `query`（任意）: CloudWatch Logs Insight のカスタムクエリ。省略時はデフォルトクエリを使用
- `time_range`（任意）: 検索範囲（分単位）。デフォルト: 30
- `region`（任意）: AWS リージョン。省略時はデフォルトリージョンを使用
- `branch`（任意）: 対象ブランチ。省略時は全ブランチを対象とする
- `pr_limit`（任意）: PR 取得件数。デフォルト: 10
- `pr_state`（任意）: PR の状態フィルタ。デフォルト: merged

## フェーズ 1: CloudWatch Logs 調査

フェーズ 2 と並列で実行できます。

### 1-1. ロググループの決定

`log_group`が指定されている場合はそのまま使用してください。未指定の場合は一覧を取得し、ユーザーに選択を促してください。

```bash
aws logs describe-log-groups --query 'logGroups[].logGroupName' --output table
```

リージョン指定がある場合は`--region`オプションを付与してください。

### 1-2. 時間範囲の計算

`time_range`（デフォルト 30 分）から開始時刻と終了時刻の UNIX タイムスタンプを算出してください。

### 1-3. Insight クエリの実行

デフォルトクエリは以下の通りです。`query`が指定されている場合はそちらを使用してください。

```
fields @timestamp, @message, @logStream
| filter @message like /(?i)(error|exception|fail|timeout|critical)/
| sort @timestamp desc
| limit 100
```

クエリの開始コマンド:

```bash
aws logs start-query \
  --log-group-name "<ロググループ名>" \
  --start-time <開始UNIXタイムスタンプ> \
  --end-time <終了UNIXタイムスタンプ> \
  --query-string '<クエリ文字列>'
```

### 1-4. 結果のポーリング

`start-query`で取得した`queryId`を使い、3 秒間隔・最大 10 回ポーリングしてください。

```bash
aws logs get-query-results --query-id "<クエリID>"
```

`status`が`Complete`になるまで待機してください。

## フェーズ 2: GitHub PR 調査

フェーズ 1 と並列で実行できます。

### 2-1. PR 一覧の取得

```bash
gh pr list --repo <owner/repo> --state closed --search "is:merged" \
  --limit <pr_limit> \
  --json number,title,author,mergedAt,headRefName,url
```

**注意:** `gh pr list --state merged`は非対応の場合があります。その場合は`--state closed --search "is:merged"`を使用してください。

`branch`が指定されている場合は`--base <branch>`オプションを追加してください。

### 2-2. PR 詳細の取得

注目すべき PR について詳細を取得してください。

```bash
gh pr view <PR番号> --repo <owner/repo> --json title,body,files,additions,deletions,mergedAt
```

### 2-3. 差分の確認

必要に応じて変更差分を確認してください。

```bash
gh pr diff <PR番号> --repo <owner/repo>
```

## フェーズ 3: 統合分析

フェーズ 1・2 の結果を突合し、以下の観点で分析してください。

1. **時刻の相関**: エラー発生時刻と PR マージ時刻を照合し、時間的に近いものを特定する
2. **ファイルの一致**: エラーログに含まれるモジュール名・ファイル名と PR の変更ファイルを照合する
3. **タイムライン作成**: PR マージとエラー発生を時系列で整理する

## フェーズ 4: 障害レポート出力

以下のフォーマットで障害レポートを出力してください。

```md
## 障害調査レポート

**調査日時:** YYYY-MM-DD HH:MM
**対象リポジトリ:** owner/repo
**対象ロググループ:** ロググループ名
**調査範囲:** YYYY-MM-DD HH:MM ~ HH:MM（N 分間）

---

### 1. 障害概要

| 項目         | 値                         |
| ------------ | -------------------------- |
| 発生時刻     | YYYY-MM-DD HH:MM:SS        |
| 影響範囲     | サービス名・コンポーネント |
| エラー件数   | N 件                       |
| エラー種別数 | N 種類                     |

### 2. エラー分析

#### エラーサマリ

| エラー種別 | 件数 | 初回発生 | 最終発生 |
| ---------- | ---- | -------- | -------- |
| ErrorType1 | N 件 | HH:MM:SS | HH:MM:SS |
| ErrorType2 | N 件 | HH:MM:SS | HH:MM:SS |

#### パターン分析

- エラーの傾向や特徴を記載

### 3. 関連 PR 分析

#### PR 一覧

| PR   | タイトル | マージ日時  | 変更規模 |
| ---- | -------- | ----------- | -------- |
| #123 | PR 名    | MM-DD HH:MM | +N/-M    |

#### 注目 PR

- **#123 PR 名**: 変更内容の要約と、エラーとの関連性の説明

### 4. タイムライン

| 時刻     | イベント       | 種別   |
| -------- | -------------- | ------ |
| HH:MM:SS | PR #123 マージ | PR     |
| HH:MM:SS | エラー初回検出 | エラー |

### 5. 根本原因の推測

調査結果に基づく根本原因の推測を記載する。

### 6. 推奨アクション

- [ ] 対応アクション 1
- [ ] 対応アクション 2
- [ ] 対応アクション 3
```

### 出力ルール

- 推測と事実を明確に区別して記載する
- エラーログの原文は必要に応じて引用する
- PR とエラーの相関が認められない場合は「関連性なし」と明記する
- 根本原因が特定できない場合は「調査継続が必要」と記載する
- 時刻はすべて JST で表記する
- テーブル内のデータは件数が多い場合、上位を抜粋して記載する
