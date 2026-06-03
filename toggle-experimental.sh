#!/bin/bash

# Stage 6（間欠障害）の EXPERIMENTAL_MODE フラグを切り替える講師用スクリプト。
# on にすると約 30% の間欠失敗が発火し、off で復旧する。
# update-function-configuration は環境変数マップを丸ごと置き換えるため、
# APP_NAME / SSM_PARAM_NAME も含めて再設定している（他の env を消さないため）。

if [ $# -lt 2 ]; then
  echo "Usage: $0 <on|off> <user-name1> [user-name2 ...]"
  echo "Example: $0 on USER01 USER02"
  exit 1
fi

MODE="$1"
shift
USER_NAMES=("$@")

if [ "$MODE" != "on" ] && [ "$MODE" != "off" ]; then
  echo "Error: first argument must be 'on' or 'off'"
  exit 1
fi

for USER_NAME in "${USER_NAMES[@]}"; do
  FUNCTION_NAME="workshop-${USER_NAME}-fn"
  echo "=== Setting EXPERIMENTAL_MODE=${MODE} on: $FUNCTION_NAME ==="

  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment "Variables={APP_NAME=workshop-${USER_NAME},SSM_PARAM_NAME=/workshop/${USER_NAME}/test-key,EXPERIMENTAL_MODE=${MODE}}" \
    --output text --query 'Environment.Variables'

done
