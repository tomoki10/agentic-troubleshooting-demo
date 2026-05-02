#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { SampleCodeStack } from '../lib/sample-code-stack';

const app = new cdk.App();

const participantIds = (app.node.tryGetContext('participantIds') as string[] | undefined) ?? ['demo'];

new SampleCodeStack(app, 'SampleCodeStack', {
  env: {
    region: 'ap-northeast-1',
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  participantIds,
});
