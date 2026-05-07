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
  --name /workshop/test-key \
  --type String \
  --value "..." \
  --region ap-northeast-1
```

参加者 IAM ユーザは別途 CLI で作成し、`WorkshopParticipantPolicy` をアタッチする。`<id>` は IAM ユーザ名と一致させる必要がある（`${aws:username}` で SSM をスコープしているため）。

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
aws cloudwatch describe-alarms --alarm-names "workshop-demo-fn-error-alarm"
```

