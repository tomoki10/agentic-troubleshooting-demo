import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({});

export const handler = async (event: unknown) => {
  console.log('Lambda function started', JSON.stringify(event));

  const paramName = process.env.SSM_PARAM_NAME;
  const appName = process.env.APP_NAME ?? 'workshop-app';

  if (!paramName) {
    const errorMessage = 'SSM_PARAM_NAME environment variable is not set';
    console.error(`[ERROR] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  console.log(`App: ${appName}, fetching SSM parameter: ${paramName}`);

  try {
    const result = await ssmClient.send(new GetParameterCommand({ Name: paramName }));
    console.log('Successfully fetched SSM parameter');
    return {
      statusCode: 200,
      body: JSON.stringify({
        appName,
        message: 'Success',
        value: result.Parameter?.Value,
      }),
    };
  } catch (error) {
    const message = `Failed to fetch SSM parameter ${paramName}: ${(error as Error).message}`;
    console.error(`[ERROR] ${message}`);
    throw new Error(message);
  }
};
