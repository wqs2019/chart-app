#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "当前项目的 tcb-cli 不支持 'tcb db create/index'，已切换为 Node 管理 SDK 方案。"
echo "请先准备以下环境变量："
echo "  TCB_SECRET_ID"
echo "  TCB_SECRET_KEY"
echo "  TCB_ENV_ID"
echo "可选环境变量："
echo "  TCB_REGION"
echo "-----------------------------------"

node "$PROJECT_ROOT/scripts/init_tcb_db.js"
