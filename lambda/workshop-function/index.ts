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

  let result;
  try {
    result = await ssmClient.send(new GetParameterCommand({ Name: paramName }));
    console.log('Successfully fetched SSM parameter');
  } catch (error) {
    const message = `Failed to fetch SSM parameter ${paramName}: ${(error as Error).message}`;
    console.error(`[ERROR] ${message}`);
    throw new Error(message);
  }

  // Stage 6: 実験的フィーチャーフラグ EXPERIMENTAL_MODE が on のとき、
  // ある経路が約 30% で失敗する「間欠障害」を再現する（誤ったフラグのロールアウト想定）。
  const experimentalMode = (process.env.EXPERIMENTAL_MODE ?? 'off').toLowerCase() === 'on';
  if (experimentalMode) {
    // 原因とは無関係な良性 WARN（毎回出力されるノイズ。故障原因ではない）
    console.warn("[WARN] deprecated config key 'legacyTimeout' ignored; using default");
    if (Math.random() < 0.3) {
      // ログ単体では原因（フラグ）が分からない汎用的なエラー文言にしておく
      const message = 'Experimental request path failed (transient)';
      console.error(`[ERROR] ${message}`);
      throw new Error(message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      appName,
      message: 'Success',
      experimentalMode,
      value: result.Parameter?.Value,
    }),
  };
};
