import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface WorkshopSsmParametersProps {
  userId: string;
}

export class WorkshopSsmParameters extends Construct {
  public readonly typoParam: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: WorkshopSsmParametersProps) {
    super(scope, id);

    // typo（アンダースコア）の方のみ作成。Lambda はハイフン版を読みに行って ParameterNotFound で失敗する
    this.typoParam = new ssm.StringParameter(this, 'TypoParam', {
      parameterName: `/workshop/${props.userId}/test_key`,
      stringValue: 'dummy-value-for-workshop',
      description: 'Test key',
    });
  }
}
