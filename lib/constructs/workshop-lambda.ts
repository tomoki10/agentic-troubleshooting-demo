import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as path from 'path';

export interface WorkshopLambdaProps {
  userId: string;
  // Stage 6 の間欠障害フラグ。'on' で約 30% の間欠失敗を再現する。デフォルトは 'off'（Stage 0-5 のみ）。
  experimentalMode?: string;
}

export class WorkshopLambda extends Construct {
  public readonly function: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: WorkshopLambdaProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    const lambdaRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [`arn:aws:ssm:${stack.region}:${stack.account}:parameter/workshop/${props.userId}/*`],
      })
    );

    // ロググループを明示的に作成し、スタック削除時に確実に削除されるようにする
    // （Lambda が自動作成するロググループは CloudFormation 管理外となり削除されずに残るため）
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/workshop-${props.userId}-fn`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.function = new nodejs.NodejsFunction(this, 'Function', {
      functionName: `workshop-${props.userId}-fn`,
      logGroup,
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../../lambda/workshop-function/index.ts'),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.seconds(10),
      reservedConcurrentExecutions: 3,
      role: lambdaRole,
      environment: {
        APP_NAME: `workshop-${props.userId}`,
        // ★変更ポイント
        SSM_PARAM_NAME: `/workshop/${props.userId}/test-key`,
        // Stage 6: 間欠障害フラグ。講師が on に切り替えて発火、受講者が off に戻して復旧させる。
        EXPERIMENTAL_MODE: props.experimentalMode ?? 'off',
      },
    });

    const errorsMetric = this.function.metricErrors({
      period: Duration.minutes(1),
      statistic: 'Sum',
    });

    new cloudwatch.Alarm(this, 'ErrorAlarm', {
      alarmName: `workshop-${props.userId}-fn-error-alarm`,
      metric: errorsMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }
}
