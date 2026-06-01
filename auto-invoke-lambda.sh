#!/bin/bash

# 引数チェック
if [ $# -lt 1 ]; then
  echo "Usage: $0 <user-name1> [user-name2 ...]"
  echo "Example: $0 USER01 USER02"
  exit 1
fi

USER_NAMES=("$@")

for USER_NAME in "${USER_NAMES[@]}"; do
  FUNCTION_NAME="workshop-${USER_NAME}-fn"
  echo "=== Invoking Lambda: $FUNCTION_NAME ==="

  aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload '{}' \
    --cli-binary-format raw-in-base64-out \
    "response-${USER_NAME}.json"

done
