---
name: investigate-cloudwatch
description: >
  Amazon CloudWatch Logs（Logs Insights）でログを検索・集計し、エラーや障害の兆候を調査する。
  CloudWatch、ログ、Insights、ロググループ、Lambda のログ、API Gateway のログ、5xx、タイムアウト、
  スタックトレース、障害調査、本番のエラー確認などでは、このスキルに沿って aws CLI で調査する。
  メトリクスだけでなく、期間を切ったエラー抽出、件数推移、ストリーム偏りまで含めたログ調査に使う。
user-invocable: true
allowed-tools: Bash(aws logs *)
---

CloudWatch Logs Insights を主に使い、ログを検索・分析し、エラーや異常のレポートを生成する。

**前提:** AWS CLI が認証済みで `aws logs` が実行できること。リージョンはプロファイルのデフォルトか、引数の `region`。

## 使用例

```text
/investigate-cloudwatch log_group=/aws/lambda/workshop-demo-fn --profile workshop
```

## 引数

- `log_group`（任意）: ロググループ名。省略時はロググループ一覧を取得し、ユーザーに選んでもらう
- `log_groups`（任意）: 複数グループをまとめて調べる名前のリスト。指定時は複数グループ向け Insights を優先
- `query`（任意）: カスタム Insight クエリ。省略時はエラー系キーワードのデフォルトクエリを使用
- `time_range`（任意）: 検索範囲（分）。デフォルト 30
- `region`（任意）: AWS リージョン。省略時は CLI のデフォルト

## ステップ 1: ロググループの決定

`log_group` が指定済みならそのまま使う。`log_groups` がある場合はステップ 3 で複数グループクエリを使う。

未指定の場合は、以下のコマンドでロググループ一覧を取得し、ユーザーに選んでもらう。

```bash
aws logs describe-log-groups --query 'logGroups[].logGroupName' --output text
```

`region` が指定された場合は `--region` オプションを付与する。

```bash
aws logs describe-log-groups --query 'logGroups[].logGroupName' --output text --region ap-northeast-1
```

ロググループ数が多い場合は `--log-group-name-prefix` で絞り込む（例: `/aws/lambda/`）。

## ステップ 2: 時間範囲の計算

`date +%s` で現在時刻の UNIX タイムスタンプ（秒）を取得し、`time_range` 分を減算して開始時刻を算出する。

```bash
END_TIME=$(date +%s)
START_TIME=$((END_TIME - 30 * 60))
```

`time_range` が N 分なら `30` を N に置き換える。

レポートの調査期間は **JST** で記載する（Unix 秒から換算してよい）。

## ステップ 3: Insight クエリの実行

`aws logs start-query` でクエリを実行する。`<LOG_GROUP>` は実際のロググループ名に置き換える。

### デフォルトクエリ（本文）

`query` が未指定のときは、広めのパターンで異常行を拾う。

```
fields @timestamp, @message, @logStream
| filter @message like /(?i)(error|exception|fail|fatal|timeout|critical|5\d{2})/
| sort @timestamp desc
| limit 100
```

JSON 1 行ログ（Lambda 等）でレベルフィールドがある場合の補助クエリ（ヒットしなければ上のクエリに戻す）。

```
fields @timestamp, @message, @logStream
| filter @message like /"level"\s*:\s*"(ERROR|FATAL)"/
   or @message like /(?i)(error|exception|fail|fatal|timeout|critical)/
| sort @timestamp desc
| limit 100
```

件数・時間の偏りを見る集計。以下のいずれかに該当する場合に実行する:

- メインクエリのヒット件数が 10 件以上
- `time_range` が 30 分を超えている
- ユーザーが「推移を見たい」「いつから発生しているか」などを明示している

該当しない場合は省略し、レポートの「時間帯・件数推移」セクションも省略する。

```
stats count(*) as cnt by bin(5m) as period
| sort period desc
```

### start-query（単一ロググループ）

```bash
aws logs start-query \
  --log-group-name '<LOG_GROUP>' \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --query-string 'fields @timestamp, @message, @logStream
| filter @message like /(?i)(error|exception|fail|fatal|timeout|critical|5\d{2})/
| sort @timestamp desc
| limit 100'
```

### start-query（複数ロググループ）

CLI が対応していれば `--log-group-names` でまとめて検索する。環境により未対応の場合はグループごとにクエリを分け、レポートで結果をマージする。

```bash
aws logs start-query \
  --log-group-names '<LOG_GROUP_A>' '<LOG_GROUP_B>' \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --query-string 'fields @timestamp, @message, @logStream, @logGroup
| filter @message like /(?i)(error|exception|fail|fatal|timeout|critical)/
| sort @timestamp desc
| limit 100'
```

### カスタムクエリ

`query` が指定された場合は `--query-string` にその文字列を使う。

`region` が指定された場合は `start-query` と `get-query-results` に `--region` を付ける。

レスポンスの `queryId` を控える。

## ステップ 4: 結果のポーリング

`aws logs get-query-results` で結果を取得する。ステータスが `Complete` になるまで 3 秒間隔で最大 10 回ポーリングする。

ステータス確認は `--query 'status' --output text` を使う。JSON 内の制御文字（Lambda スタックトレース等）による python3 パースエラーを避けるため、インライン JSON パースは行わない。

```bash
# ポーリング: ステータスのみ取得
STATUS=$(aws logs get-query-results \
  --query-id '<queryId>' \
  --query 'status' --output text)

# Complete 確認後: 全件取得
aws logs get-query-results \
  --query-id '<queryId>' \
  --output json
```

メインクエリと stats クエリを両方実行する場合は、1 つのループ内でまとめてポーリングし、Bash 呼び出し回数を削減する。

```bash
for i in $(seq 1 10); do
  MAIN_ST=$(aws logs get-query-results --query-id "$MAIN_QID" --query 'status' --output text)
  STATS_ST=$(aws logs get-query-results --query-id "$STATS_QID" --query 'status' --output text)
  [ "$MAIN_ST" = "Complete" ] && [ "$STATS_ST" = "Complete" ] && break
  sleep 3
done
```

ポーリングの流れ:

1. `get-query-results` を実行
2. `status` が `Complete` なら結果を取得して次のステップへ進む
3. `Running` または `Scheduled` なら 3 秒待機して再実行
4. 10 回試行しても完了しない場合はタイムアウトとしてユーザーに通知する
5. `Failed` や `Cancelled` の場合は API メッセージをレポートに載せ、クエリ・期間・IAM 権限を確認するよう案内する

## ステップ 5: 追加分析

取得したログを以下の観点で分析する。

### エラーパターンの集計

- `@message` からエラー種別（例: NullPointerException, TimeoutError, ConnectionRefused）を抽出
- 種別ごとの発生件数を集計

### ログストリーム別の集計

- `@logStream` ごとの件数を集計
- 特定のストリームにエラーが集中していないか確認

### 時間帯分析

- エラーの発生時間帯に偏りがないか確認
- 特定の時間帯に集中している場合はその旨を記載

### ヒットがゼロのとき

- 期間を延ばす、フィルタを緩める、別ロググループ（API Gateway / ALB / アプリ）を疑う、といった次の手を所見に書く

## ステップ 6: レポート出力

以下のフォーマットで結果を出力する。

```md
## CloudWatch Logs 調査レポート

- **ロググループ:** （複数なら列挙）
- **リージョン:**
- **調査期間:** YYYY-MM-DD HH:MM - YYYY-MM-DD HH:MM (JST)
- **使用クエリ:** デフォルト / カスタム（カスタムなら全文または要約）
- **検出件数:** N 件（Insights 結果行ベース）

### エラーサマリ

| エラー種別        | 件数 | 最終発生時刻 (JST)  |
| ----------------- | ---- | ------------------- |
| TimeoutError      | 15   | 2026-02-17 10:30:00 |
| ConnectionRefused | 8    | 2026-02-17 10:25:00 |

### ログストリーム別

| ログストリーム | 件数 |
| -------------- | ---- |
| stream-001     | 12   |
| stream-002     | 11   |

### パターン分析

- エラーの傾向や特徴の説明（断定しすぎない）
- 時間帯の偏りに関する所見

### 時間帯・件数推移（stats を実行した場合）

- bin 集計から分かったこと（ピーク、急増の有無）

### 詳細ログ（主要なもの）

| タイムスタンプ (JST) | ログストリーム | メッセージ（抽出） |
| -------------------- | -------------- | ------------------ |
| 2026-02-17 10:30:00  | stream-001     | TimeoutError: ...  |

### 所見と次のアクション

- 検出された問題の要約
- 推定される原因（複数候補があれば列挙）
- 推奨対応
```

### 出力ルール

- タイムスタンプは JST で表示する
- 詳細ログは件数が多い場合、主要なものを 10 件程度に絞る
- エラーが 0 件の場合は「対象期間・クエリではエラーは検出されませんでした」とし、期間拡大やクエリ緩和を提案する
- カスタムクエリ使用時はクエリ内容もレポートに記載する
- 所見には推定原因と推奨対応を含める
- PII やトークン全文が含まれる場合はマスクしてよい

## 補足: filter-log-events（スポット確認）

Insights 以外に直近だけ素早く見る場合。開始・終了は **Unix ミリ秒** なので秒に 1000 を掛ける。

```bash
aws logs filter-log-events \
  --log-group-name '<LOG_GROUP>' \
  --start-time $((START_TIME * 1000)) \
  --end-time $((END_TIME * 1000)) \
  --filter-pattern 'ERROR' \
  --max-items 50
```

ログ形式に合わない場合は `--filter-pattern` を外すか Insights に切り替える。
