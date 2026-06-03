# 障害シナリオ

Lambda でエラーが発生するため調査を行う。

Stage 4 で参加者か講師が以下のコマンドで暫定対応する想定。

```bash
# 講師のみ
aws ssm put-parameter \
  --name /workshop/<userId>/test-key \
  --type String \
  --value "..." \
  --region ap-northeast-1

# ユーザー単位
aws ssm put-parameter \
  --name /workshop/<userId>/test-key \
  --type String \
  --value "..." \
  --region ap-northeast-1
```

参加者 IAM ユーザは別途 CLI で作成し、`WorkshopParticipantPolicy`（`WorkshopSharedStack` が出力）をアタッチする。`<userId>` は IAM ユーザ名・参加者スタック `SampleCodeStack-<userId>` のサフィックスと一致させる必要がある（`${aws:username}` で SSM / Lambda / Logs をスコープしているため）。

```bash
export USER_NAME="alice"
aws iam create-user --user-name $USER_NAME
aws iam attach-user-policy \
  --user-name $USER_NAME \
  --policy-arn <WorkshopParticipantPolicyArn>
aws iam create-access-key --user-name $USER_NAME
```

設定側：

```bash
aws configure

AWS Access Key ID [None]: csv の Access key ID
# Enter
AWS Secret Access Key [None]: csv の Secret access key
# Enter
Default region name [None]: 未入力
ap-northeast-1
Default output format [None]: 未入力
json
```

疎通確認

```bash
aws cloudwatch describe-alarms --alarm-names "workshop-<userId>-fn-error-alarm"
```

## Stage 6: 間欠障害（EXPERIMENTAL_MODE フラグの誤ロールアウト）

Stage 4 で typo を解消し、Lambda が成功する状態になっている前提の発展シナリオ。

実験的フィーチャーフラグ `EXPERIMENTAL_MODE=on` を有効にすると、ある経路が **約 30% の確率で失敗** する間欠障害が発生する。さらに毎回 **無関係な良性 WARN**（`deprecated config key 'legacyTimeout' ignored`）が出力され、ノイズになる。

- 常時失敗ではなく間欠（約 30%）である点を、Logs Insights の集計で切り分けるのが調査のポイント
- WARN は故障原因ではない（赤いニシン）
- 根本原因は Lambda の環境変数 `EXPERIMENTAL_MODE=on`。関数設定の確認と、フラグを有効化した PR の相関で特定する

### 講師: 発火（Stage 6 開始時）

```bash
# 単体
./toggle-experimental.sh on alice
# 複数人まとめて
./toggle-experimental.sh on alice bob charlie

# トラフィックを流してログ/メトリクスを溜める
while true; do ./auto-invoke-lambda.sh alice; sleep 60; done
```

### 受講者: 暫定対応（ask モードで実行）

`EXPERIMENTAL_MODE` を `off` に戻す。`update-function-configuration` は環境変数を丸ごと置き換えるため、既存の `APP_NAME` / `SSM_PARAM_NAME` を残したまま更新する。

```bash
# まず現在の環境変数を確認
aws lambda get-function-configuration \
  --function-name workshop-<userId>-fn \
  --query 'Environment.Variables'

# EXPERIMENTAL_MODE だけ off に戻す（他の env は残す）
aws lambda update-function-configuration \
  --function-name workshop-<userId>-fn \
  --environment "Variables={APP_NAME=workshop-<userId>,SSM_PARAM_NAME=/workshop/<userId>/test-key,EXPERIMENTAL_MODE=off}"
```

反映後、数回 invoke してエラー率が 0 に戻ることを確認する。

