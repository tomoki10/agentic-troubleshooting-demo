import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { WorkshopParticipantPolicy } from './constructs/workshop-participant-policy';

/**
 * 全参加者で共有するスタック。
 *
 * 参加者用の最小権限ポリシーは `${aws:username}` で各自のリソースにスコープするため、
 * 物理的には 1 つで足りる。参加者ごとのスタック（SampleCodeStack-<userId>）とは別に、
 * 1 つだけデプロイする。
 */
export class WorkshopSharedStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 参加者用の最小権限ポリシー（aws:username で各自のリソースにスコープ）
    const participantPolicy = new WorkshopParticipantPolicy(this, 'WorkshopParticipantPolicy');
    new cdk.CfnOutput(this, 'WorkshopParticipantPolicyArn', {
      value: participantPolicy.policy.managedPolicyArn,
      description: 'Policy ARN for workshop participants (attach to IAM users via CLI)',
    });
  }
}
