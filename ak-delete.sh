#!/bin/bash

# 引数チェック
if [ $# -lt 1 ]; then
  echo "Usage: $0 <user-name1> [user-name2 ...]"
  echo "Example: $0 USER01 USER02"
  exit 1
fi

USER_NAMES=("$@")

for USER_NAME in "${USER_NAMES[@]}"; do
  echo "=== Deleting user: $USER_NAME ==="

  # アクセスキーの無効化と削除
  echo "  Deactivating and deleting access keys..."
  ACCESS_KEY_IDS=$(aws iam list-access-keys \
    --user-name "$USER_NAME" \
    --query 'AccessKeyMetadata[].AccessKeyId' \
    --output text)

  for AK_ID in $ACCESS_KEY_IDS; do
    echo "  Disabling $AK_ID"
    aws iam update-access-key \
      --user-name "$USER_NAME" \
      --access-key-id "$AK_ID" \
      --status Inactive

    echo "  Deleting $AK_ID"
    aws iam delete-access-key \
      --user-name "$USER_NAME" \
      --access-key-id "$AK_ID"
  done

  # アタッチされたポリシーのデタッチ
  echo "  Detaching policies..."
  POLICY_ARNS=$(aws iam list-attached-user-policies \
    --user-name "$USER_NAME" \
    --query 'AttachedPolicies[].PolicyArn' \
    --output text)

  for POLICY_ARN in $POLICY_ARNS; do
    echo "  Detaching $POLICY_ARN"
    aws iam detach-user-policy \
      --user-name "$USER_NAME" \
      --policy-arn "$POLICY_ARN"
  done

  # IAMユーザーの削除
  echo "  Deleting user $USER_NAME..."
  aws iam delete-user --user-name "$USER_NAME"

  echo "=== Deleted user: $USER_NAME ==="
done
