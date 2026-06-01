#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { SampleCodeStack } from '../lib/sample-code-stack';
import { WorkshopSharedStack } from '../lib/workshop-shared-stack';

const app = new cdk.App();

// ユーザー指定の参加者 ID をコンテキストから取得。指定がない場合は 'demo' を使用（司会側でデモを行う想定）
// CLI の `--context participantIds='["alice","bob"]'` では文字列で渡るため JSON パースする。
// cdk.json の context に配列で直接書いた場合はそのまま使う。
const rawParticipantIds = app.node.tryGetContext('participantIds') as string[] | string | undefined;
const participantIds: string[] =
  rawParticipantIds === undefined
    ? ['demo']
    : Array.isArray(rawParticipantIds)
      ? rawParticipantIds
      : (JSON.parse(rawParticipantIds) as string[]);

const env = {
  region: 'ap-northeast-1',
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

// 全参加者で共有するスタック（参加者ポリシーは ${aws:username} スコープのため 1 つで足りる）
new WorkshopSharedStack(app, 'WorkshopSharedStack', { env });

// 参加者ごとに独立したスタックを生成（別々のログ・Lambda を持つ）
for (const userId of participantIds) {
  new SampleCodeStack(app, `SampleCodeStack-${userId}`, {
    env,
    participantId: userId,
  });
}
