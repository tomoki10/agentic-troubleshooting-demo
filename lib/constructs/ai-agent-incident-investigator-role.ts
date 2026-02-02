import * as iam from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export class AiAgentIncidentInvestigatorRole extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.role = new iam.Role(this, 'Role', {
      roleName: 'AiAgentIncidentInvestigatorRole',
      assumedBy: new iam.AccountPrincipal(Stack.of(this).account),
    });

    // ポリシーA: CloudWatch中心
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudWatchInvestigationPolicy',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudwatch:Describe*',
          'cloudwatch:Get*',
          'cloudwatch:List*',
          'logs:Describe*',
          'logs:Get*',
          'logs:FilterLogEvents',
          'logs:StartQuery',
          'logs:GetQueryResults',
          'synthetics:Describe*',
          'synthetics:Get*',
        ],
        resources: ['*'],
      })
    );

    // ポリシーB: その他サービス
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AwsInvestigationPolicy',
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudtrail:LookupEvents',
          'cloudtrail:GetTrailStatus',
          'health:Describe*',
          'ec2:Describe*',
          'ecs:Describe*',
          'ecs:List*',
          'lambda:GetFunction',
          'lambda:ListFunctions',
          'lambda:GetFunctionConfiguration',
          'rds:Describe*',
          's3:GetBucketLocation',
          's3:ListBucket',
          'support:DescribeTrustedAdvisorChecks',
          'support:DescribeTrustedAdvisorCheckResult',
        ],
        resources: ['*'],
      })
    );

    // SSM（SecureString除外）
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SsmInvestigationPolicy',
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:DescribeInstanceInformation',
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath',
        ],
        resources: ['*'],
        conditions: {
          StringNotEquals: {
            'ssm:ResourceTag/aws:ssm:parameterType': 'SecureString',
          },
        },
      })
    );
  }
}
