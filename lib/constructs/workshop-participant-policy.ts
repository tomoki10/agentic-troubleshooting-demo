import * as cdk from 'aws-cdk-lib/core';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class WorkshopParticipantPolicy extends Construct {
  public readonly policy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    this.policy = new iam.ManagedPolicy(this, 'Policy', {
      managedPolicyName: 'WorkshopParticipantPolicy',
      description: 'Minimal-privilege policy for workshop participants (logs read / lambda read / ssm scoped',
      statements: [
        new iam.PolicyStatement({
          sid: 'ReadLogs',
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:FilterLogEvents',
            'logs:StartQuery',
            'logs:GetQueryResults',
            'logs:DescribeLogGroups',
            'cloudwatch:DescribeAlarms',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'ReadLambda',
          effect: iam.Effect.ALLOW,
          actions: ['lambda:GetFunction', 'lambda:GetFunctionConfiguration', 'lambda:ListFunctions'],
          resources: [`arn:aws:lambda:${stack.region}:${stack.account}:function:workshop-*`],
        }),
        new iam.PolicyStatement({
          sid: 'SsmScoped',
          effect: iam.Effect.ALLOW,
          actions: ['ssm:GetParameter', 'ssm:PutParameter', 'ssm:DescribeParameters'],
          resources: [`arn:aws:ssm:${stack.region}:${stack.account}:parameter/workshop/*`],
        }),
      ],
    });
  }
}
