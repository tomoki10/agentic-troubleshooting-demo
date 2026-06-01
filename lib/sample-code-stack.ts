import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { WorkshopLambda } from './constructs/workshop-lambda';
import { WorkshopSsmParameters } from './constructs/workshop-ssm-parameters';

export interface SampleCodeStackProps extends cdk.StackProps {
  participantId: string;
}

/**
 * 参加者 1 名分のスタック。
 *
 * 参加者ごとに別スタック（SampleCodeStack-<userId>）としてデプロイすることで、
 * Lambda・CloudWatch Logs・SSM パラメータを参加者単位で完全に分離する。
 */
export class SampleCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SampleCodeStackProps) {
    super(scope, id, props);

    const userId = props.participantId;

    // 参加者ごとに Lambda + typo SSM パラメータを作成
    new WorkshopSsmParameters(this, `WorkshopSsm-${userId}`, { userId });
    const workshopLambda = new WorkshopLambda(this, `WorkshopLambda-${userId}`, { userId });

    new cdk.CfnOutput(this, 'WorkshopLambdaFunctionName', {
      value: workshopLambda.function.functionName,
      description: `Lambda function name for participant ${userId}`,
    });
  }
}
