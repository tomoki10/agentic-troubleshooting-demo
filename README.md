# agentic-troubleshooting-demo

AI Ops 研修「Claude Code でアプリ障害の一次調査を行う」用のデモ環境を構築する CDK プロジェクト。

参加者ごとに、SSM パラメータ名 typo を原因とした `ParameterNotFound` を発火する Lambda を払い出す。

## ディレクトリ構成

```text
.
├── bin/
│   └── sample-code.ts                 # CDK エントリーポイント
├── lib/
│   ├── sample-code-stack.ts           # スタック本体
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

## 構成リソース

参加者 ID ごとに以下を作成。

| リソース | 名前/値 |
| --- | --- |
| Lambda | `workshop-<userId>-fn` |
| Lambda 環境変数 `SSM_PARAM_NAME` | `/workshop/<userId>/test-key`（正） |
| SSM Parameter | `/workshop/<userId>/test_key`（誤・アンダースコア） |
| CloudWatch Alarm | `workshop-<userId>-fn-error-alarm` |

スタック共通で以下を作成。

| リソース | 用途 |
| --- | --- |
| `WorkshopParticipantPolicy` | 参加者 IAM ユーザにアタッチする最小権限ポリシー |
| `AiAgentIncidentInvestigatorPolicy` | AI Agent 用の広範な調査ポリシー |

## デプロイ

リージョンは `ap-northeast-1` 固定。

```bash
# 1人分（デフォルト: userId=demo）
pnpm cdk deploy

# 複数参加者
pnpm cdk deploy --context participantIds='["alice","bob","charlie"]'
```

## 主要コマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm build` | TypeScript ビルド |
| `pnpm cdk synth` | CloudFormation テンプレート合成 |
| `pnpm cdk deploy` | デプロイ |
| `pnpm cdk diff` | 差分確認 |
| `pnpm test` | Jest テスト実行 |
