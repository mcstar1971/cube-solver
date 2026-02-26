#!/bin/bash
# auto-push-notify.sh - 自动重试推送并发送消息通知
# 用法: ./scripts/auto-push-notify.sh [commit-message]

set -e
cd "$(dirname "$0")/.."

# 配置
MAX_RETRIES=20
RETRY_INTERVAL=180  # 3分钟
REPO_NAME="cube-solver"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    if [ -n "$1" ]; then
        log "有未提交的更改，正在提交..."
        git add -A
        git commit -m "$1"
    else
        log "错误: 有未提交的更改但没有提供 commit message"
        exit 1
    fi
fi

# 检查是否需要推送
REMOTE_MAIN=$(git rev-parse origin/main 2>/dev/null || echo "")
LOCAL_MAIN=$(git rev-parse HEAD)

if [ "$LOCAL_MAIN" = "$REMOTE_MAIN" ]; then
    log "没有需要推送的提交"
    exit 0
fi

AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "未知")
log "待推送提交数: $AHEAD"

# 推送重试
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "第 $RETRY_COUNT 次尝试推送..."
    
    if git push origin main 2>&1; then
        log "✅ 推送成功！"
        
        # 创建成功标记文件
        echo "SUCCESS:$AHEAD" > /tmp/cube-push-status.txt
        
        # 尝试发送通知
        if command -v notify-send &> /dev/null; then
            notify-send "Git Push 成功" "$REPO_NAME 推送完成，共 $AHEAD 个提交"
        fi
        
        exit 0
    fi
    
    log "❌ 推送失败，等待 ${RETRY_INTERVAL}s 后重试..."
    sleep $RETRY_INTERVAL
done

log "已达到最大重试次数，放弃"
echo "FAILED:$RETRY_COUNT" > /tmp/cube-push-status.txt
exit 1
