import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { AiAgentIncidentInvestigatorRole } from './constructs/ai-agent-incident-investigator-role';

export class SampleCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const investigatorRole = new AiAgentIncidentInvestigatorRole(this, 'AiAgentIncidentInvestigatorRole');

    new cdk.CfnOutput(this, 'AiAgentIncidentInvestigatorRoleArn', {
      value: investigatorRole.role.roleArn,
      description: 'ARN of the AI Agent Incident Investigator Role',
    });
  }
}
