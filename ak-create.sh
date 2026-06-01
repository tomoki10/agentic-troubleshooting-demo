#!/bin/bash

# 引数チェック
if [ $# -lt 1 ]; then
  echo "Usage: $0 <account-id> [user-name1 user-name2 ...]"
  echo "Example: $0 123456789012 USER01 USER02"
  exit 1
fi

ACCOUNT_ID="$1"
shift

# 第2引数以降がある場合はそれをユーザー名として使用、なければデフォルト値を使用
if [ $# -gt 0 ]; then
  USER_NAMES=("$@")
else
  USER_NAMES=("USER01")
fi

for USER_NAME in "${USER_NAMES[@]}"; do
  export USER_NAME
  echo "=== Creating user: $USER_NAME ==="

  aws iam create-user --user-name "$USER_NAME"

  aws iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/WorkshopParticipantPolicy"

  aws iam create-access-key --user-name "$USER_NAME" >> "access-key.json"
done
