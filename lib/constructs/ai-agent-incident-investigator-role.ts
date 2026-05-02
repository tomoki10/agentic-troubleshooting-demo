import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class AiAgentIncidentInvestigatorRole extends Construct {
  public readonly policy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.policy = new iam.ManagedPolicy(this, 'Policy', {
      managedPolicyName: 'AiAgentIncidentInvestigatorPolicy',
      statements: [
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
        }),
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
            's3:ListAllMyBuckets',
            's3:GetBucketLocation',
            's3:ListBucket',
            'support:DescribeTrustedAdvisorChecks',
            'support:DescribeTrustedAdvisorCheckResult',
          ],
          resources: ['*'],
        }),
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
        }),
      ],
    });
  }
}
