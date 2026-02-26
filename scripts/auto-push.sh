#!/bin/bash
# auto-push.sh - 自动重试推送脚本
# 用法: ./scripts/auto-push.sh [commit-message]

cd "$(dirname "$0")/.."

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "有未提交的更改，先提交..."
    if [ -n "$1" ]; then
        git add -A
        git commit -m "$1"
    else
        echo "错误: 有未提交的更改但没有提供 commit message"
        echo "用法: $0 \"commit message\""
        exit 1
    fi
fi

# 检查是否需要推送
if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main 2>/dev/null)" ]; then
    echo "没有需要推送的提交"
    exit 0
fi

# 获取待推送的提交数
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "未知")
echo "待推送提交数: $AHEAD"

# 推送重试循环
MAX_RETRIES=20  # 最多重试20次（约1小时）
RETRY_COUNT=0

while true; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 第 $RETRY_COUNT 次尝试推送..."
    
    if git push origin main 2>&1; then
        echo "✅ 推送成功！"
        
        # 发送消息通知（通过 OpenClaw 的消息系统）
        # 检查是否有 message 工具可用
        if command -v notify-send &> /dev/null; then
            notify-send "Git Push 成功" "cube-solver 推送完成，共 $AHEAD 个提交"
        fi
        
        # 如果有 webhook 或其他通知方式，可以在这里添加
        # 例如调用 OpenClaw 的 message API
        if [ -n "$NOTIFY_WEBHOOK" ]; then
            curl -s -X POST "$NOTIFY_WEBHOOK" \
                -H "Content-Type: application/json" \
                -d "{\"text\": \"✅ cube-solver 推送成功！共 $AHEAD 个提交\"}" \
                > /dev/null 2>&1 || true
        fi
        
        exit 0
    else
        echo "❌ 推送失败"
        
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            echo "已达到最大重试次数 ($MAX_RETRIES)，放弃"
            exit 1
        fi
        
        echo "等待 3 分钟后重试..."
        sleep 180
    fi
done
