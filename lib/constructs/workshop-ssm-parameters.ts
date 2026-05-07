import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface WorkshopSsmParametersProps {
  userId: string;
}

export class WorkshopSsmParameters extends Construct {
  public readonly typoParam: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: WorkshopSsmParametersProps) {
    super(scope, id);

    this.typoParam = new ssm.StringParameter(this, 'TypoParam', {
      parameterName: `/workshop/${props.userId}/test_key`,
      stringValue: 'dummy-value-for-workshop',
      description: 'Test key',
    });
  }
}
