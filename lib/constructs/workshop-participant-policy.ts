import * as cdk from 'aws-cdk-lib/core';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * 参加者用の最小権限ポリシー。
 *
 * `${aws:username}` で各自のリソース（workshop-<username>-fn / /workshop/<username>/*）
 * のみに操作をスコープする。IAM ユーザ名と userId（スタック名のサフィックス）を
 * 一致させる前提。
 */
export class WorkshopParticipantPolicy extends Construct {
  public readonly policy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    this.policy = new iam.ManagedPolicy(this, 'Policy', {
      managedPolicyName: 'WorkshopParticipantPolicy',
      description: 'Minimal-privilege policy for workshop participants (scoped by aws:username)',
      statements: [
        // 一覧・記述系はリソースレベル制限に対応しないため * 許可（読み取りのみ）
        new iam.PolicyStatement({
          sid: 'ListAndDescribe',
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:DescribeLogGroups',
            'logs:StartQuery',
            'logs:GetQueryResults',
            'lambda:ListFunctions',
            'cloudwatch:DescribeAlarms',
            'ssm:DescribeParameters',
          ],
          resources: ['*'],
        }),
        // ログ読み取りは自分の Lambda ロググループに限定
        new iam.PolicyStatement({
          sid: 'ReadOwnLogs',
          effect: iam.Effect.ALLOW,
          actions: ['logs:FilterLogEvents'],
          resources: [
            `arn:aws:logs:${stack.region}:${stack.account}:log-group:/aws/lambda/workshop-\${aws:username}-fn:*`,
          ],
        }),
        // Lambda の参照は自分の関数に限定
        new iam.PolicyStatement({
          sid: 'ReadOwnLambda',
          effect: iam.Effect.ALLOW,
          actions: ['lambda:GetFunction', 'lambda:GetFunctionConfiguration'],
          resources: [`arn:aws:lambda:${stack.region}:${stack.account}:function:workshop-\${aws:username}-fn`],
        }),
        // SSM は自分の名前空間配下に限定
        new iam.PolicyStatement({
          sid: 'SsmScoped',
          effect: iam.Effect.ALLOW,
          actions: ['ssm:GetParameter', 'ssm:PutParameter'],
          resources: [`arn:aws:ssm:${stack.region}:${stack.account}:parameter/workshop/\${aws:username}/*`],
        }),
      ],
    });
  }
}
