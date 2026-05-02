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
      parameterName: `/aws/workshop/${props.userId}/anthropic_api_key`,
      stringValue: 'sk-ant-api-dummy-value-for-workshop',
      description: 'Anthropic API key (typo: underscore version, should be anthropic-api-key)',
    });
  }
}
