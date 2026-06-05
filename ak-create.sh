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

# コンソールログイン情報ファイルのヘッダー行（未存在の場合のみ）
if [ ! -f "console-login.csv" ]; then
  echo "User name,Password,Console sign-in URL" > "console-login.csv"
fi

for USER_NAME in "${USER_NAMES[@]}"; do
  export USER_NAME
  echo "=== Creating user: $USER_NAME ==="

  aws iam create-user --user-name "$USER_NAME"

  aws iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/WorkshopParticipantPolicy"

  aws iam create-access-key --user-name "$USER_NAME" >> "access-key.json"

  # コンソールログイン用パスワードを自動生成（英大小・数字・記号を必ず含む）
  PASSWORD="$(openssl rand -base64 15 | tr -d '/+=' | cut -c1-12)aA1!"

  aws iam create-login-profile \
    --user-name "$USER_NAME" \
    --password "$PASSWORD" \
    --no-password-reset-required

  echo "${USER_NAME},${PASSWORD},https://${ACCOUNT_ID}.signin.aws.amazon.com/console" >> "console-login.csv"
done
