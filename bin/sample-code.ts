#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { SampleCodeStack } from '../lib/sample-code-stack';

const app = new cdk.App();

// ユーザー指定の参加者 ID をコンテキストから取得。指定がない場合は 'demo' を使用（司会側でデモを行う想定）
const participantIds = (app.node.tryGetContext('participantIds') as string[] | undefined) ?? ['demo'];

new SampleCodeStack(app, 'SampleCodeStack', {
  env: {
    region: 'ap-northeast-1',
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  participantIds,
});
