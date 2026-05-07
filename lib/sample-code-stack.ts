import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { AiAgentIncidentInvestigatorRole } from './constructs/ai-agent-incident-investigator-role';
import { WorkshopLambda } from './constructs/workshop-lambda';
import { WorkshopParticipantPolicy } from './constructs/workshop-participant-policy';
import { WorkshopSsmParameters } from './constructs/workshop-ssm-parameters';

export interface SampleCodeStackProps extends cdk.StackProps {
  participantIds: string[];
}

export class SampleCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SampleCodeStackProps) {
    super(scope, id, props);

    // AI Agent 用の調査ポリシー（参加者用とは別管理）
    // const investigatorRole = new AiAgentIncidentInvestigatorRole(this, 'AiAgentIncidentInvestigatorRole');
    // new cdk.CfnOutput(this, 'InvestigatorPolicyArn', {
    //   value: investigatorRole.policy.managedPolicyArn,
    //   description: 'Policy ARN for AI Agent Incident Investigator',
    // });

    // 参加者用の最小権限ポリシー（aws:username で SSM スコープ）
    const participantPolicy = new WorkshopParticipantPolicy(this, 'WorkshopParticipantPolicy');
    new cdk.CfnOutput(this, 'WorkshopParticipantPolicyArn', {
      value: participantPolicy.policy.managedPolicyArn,
      description: 'Policy ARN for workshop participants (attach to IAM users via CLI)',
    });

    // 参加者ごとに Lambda + typo SSM パラメータを作成
    for (const userId of props.participantIds) {
      new WorkshopSsmParameters(this, `WorkshopSsm-${userId}`, { userId });
      const workshopLambda = new WorkshopLambda(this, `WorkshopLambda-${userId}`, { userId });

      new cdk.CfnOutput(this, `WorkshopLambdaFunctionName-${userId}`, {
        value: workshopLambda.function.functionName,
        description: `Lambda function name for participant ${userId}`,
      });
    }
  }
}
