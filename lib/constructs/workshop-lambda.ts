import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as path from 'path';

export interface WorkshopLambdaProps {
  userId: string;
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
        resources: [`arn:aws:ssm:${stack.region}:${stack.account}:parameter/aws/workshop/${props.userId}/*`],
      })
    );

    this.function = new nodejs.NodejsFunction(this, 'Function', {
      functionName: `workshop-${props.userId}-fn`,
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../../lambda/workshop-function/index.ts'),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.seconds(10),
      role: lambdaRole,
      environment: {
        APP_NAME: `workshop-${props.userId}`,
        // 正しい名前（ハイフン）。SSM 側にはアンダースコア版しかないため ParameterNotFound になる
        SSM_PARAM_NAME: `/aws/workshop/${props.userId}/anthropic-api-key`,
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
