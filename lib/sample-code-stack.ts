import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { AiAgentIncidentInvestigatorRole } from './constructs/ai-agent-incident-investigator-role';
import { DemoLambda } from './constructs/demo-lambda';
import { DemoSsmParameters } from './constructs/demo-ssm-parameters';

export class SampleCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const investigatorRole = new AiAgentIncidentInvestigatorRole(this, 'AiAgentIncidentInvestigatorRole');

    new cdk.CfnOutput(this, 'AccessKeyId', {
      value: investigatorRole.accessKey.accessKeyId,
      description: 'Access Key ID for AI Agent Incident Investigator',
    });

    new cdk.CfnOutput(this, 'SecretAccessKey', {
      value: investigatorRole.accessKey.secretAccessKey.unsafeUnwrap(),
      description: 'Secret Access Key for AI Agent Incident Investigator',
    });

    const demoParams = new DemoSsmParameters(this, 'DemoSsmParameters');
    const demoLambda = new DemoLambda(this, 'DemoLambda', {
      ssmParamName: demoParams.databaseEndpointParam.parameterName,
    });

    new cdk.CfnOutput(this, 'DemoLambdaFunctionName', {
      value: demoLambda.function.functionName,
      description: 'Name of the demo Lambda function',
    });
  }
}
