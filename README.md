# agentic-troubleshooting-demo

AI Ops 研修「Claude Code でアプリ障害の一次調査を行う」用のデモ環境を構築する CDK プロジェクト。

## ディレクトリ構成

```text
.
├── bin/
│   └── sample-code.ts                 # CDK エントリーポイント
├── lib/
│   ├── sample-code-stack.ts           # 参加者 1 名分のスタック（SampleCodeStack-<userId>）
│   ├── workshop-shared-stack.ts       # 全参加者共有スタック（参加者ポリシー）
│   └── constructs/
│       ├── workshop-lambda.ts         # workshop-<id>-fn の Lambda + Alarm
│       ├── workshop-ssm-parameters.ts # typo SSM パラメータ
│       ├── workshop-participant-policy.ts # 参加者用最小権限ポリシー
│       └── ai-agent-incident-investigator-role.ts # AI Agent 用調査ポリシー
├── lambda/
│   └── workshop-function/             # Lambda 本体ソース
│       └── index.ts
├── docs/                              # 設計メモ
├── cdk.json
├── package.json
└── tsconfig.json
```

## スタック構成

参加者ごとに独立した CloudFormation スタックを生成し、ログ・Lambda を完全に分離する。

| スタック | 単位 | 内容 |
| --- | --- | --- |
| `WorkshopSharedStack` | 全参加者で 1 つ | 参加者用最小権限ポリシー `WorkshopParticipantPolicy`（`${aws:username}` スコープ） |
| `SampleCodeStack-<userId>` | 参加者ごと | Lambda / SSM パラメータ / CloudWatch Alarm |

### `SampleCodeStack-<userId>` が作成するリソース

| リソース | 名前/値 |
| --- | --- |
| Lambda | `workshop-<userId>-fn` |
| Lambda 環境変数 `SSM_PARAM_NAME` | `/workshop/<userId>/test-key`（正） |
| SSM Parameter | `/workshop/<userId>/test_key`（誤・アンダースコア） |
| CloudWatch Alarm | `workshop-<userId>-fn-error-alarm` |

> `<userId>` は払い出す IAM ユーザ名と一致させること（参加者ポリシーが `${aws:username}` で各自のリソースにスコープしているため）。

## デプロイ

リージョンは `ap-northeast-1` 固定。

```bash
# 1人分（デフォルト: userId=demo）。WorkshopSharedStack と SampleCodeStack-demo が対象
pnpm cdk deploy --all

# 複数参加者（WorkshopSharedStack + SampleCodeStack-<userId> を全て）
pnpm cdk deploy --all --context participantIds='["alice","bob","charlie"]'

# 特定の参加者スタックだけを更新したい場合
pnpm cdk deploy SampleCodeStack-alice --context participantIds='["alice","bob","charlie"]'
```

## 参加者ユーザーの作成・削除

```bash
# ユーザーの作成（アクセスキーとコンソールログイン情報を発行）
./ak-create.sh 12345678910 alice bob charlie
# ユーザーの削除
./ak-delete.sh alice bob charlie
```

`ak-create.sh` を実行すると、以下の2ファイルが生成される。

- `access-key.json` — CLI 用アクセスキー（Access Key ID / Secret Access Key）
- `console-login.csv` — マネジメントコンソール用ログイン情報（ユーザー名、パスワード、サインイン URL）

コンソールのサインイン URL は `https://<account-id>.signin.aws.amazon.com/console` 形式。  
いずれのファイルも `.gitignore` で管理対象外。

## Lamndaの実行

```bash
# 1回実行
./auto-invoke-lambda.sh alice
# ループ実行
while true; do ./auto-invoke-lambda.sh alice; sleep 180; done
```

## Stage 6: 間欠障害フラグの切り替え（講師用）

`EXPERIMENTAL_MODE` を on にすると約 30% の間欠失敗（＋良性 WARN）が発火する。受講者は ask モードで off に戻して復旧させる。詳細は `docs/scenario.md` の Stage 6 を参照。

```bash
# 発火（Stage 6 開始）
./toggle-experimental.sh on alice bob charlie
# 復旧（収束確認用）
./toggle-experimental.sh off alice bob charlie
```

## 主要コマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm build` | TypeScript ビルド |
| `pnpm cdk synth` | CloudFormation テンプレート合成 |
| `pnpm cdk deploy` | デプロイ |
| `pnpm cdk diff` | 差分確認 |
| `pnpm test` | Jest テスト実行 |
