#!/bin/bash

set -Eeuo pipefail

APP_DIR="/www/wwwroot/aiImage/AiImage/canvas"
PM2_APP_NAME="${PM2_APP_NAME:-canvas}"
LOCK_FILE="/tmp/aiimage-canvas-deploy.lock"
BUILD_ROOT="${BUILD_ROOT:-$APP_DIR/.deploy-build}"
BUILD_DIR="$BUILD_ROOT/work"
PREVIOUS_NEXT="$APP_DIR/.next.previous"
NEXT_NEW="$APP_DIR/.next.new"
ROLLBACK_MARKER="$APP_DIR/.deploy-rollback-needed"
MIN_AVAILABLE_MB="${MIN_AVAILABLE_MB:-1400}"
MAX_LOAD_1="${MAX_LOAD_1:-4}"
BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=1024}"

log() {
  echo
  echo "=== $1 ==="
}

available_memory_mb() {
  awk '/MemAvailable/ { print int($2 / 1024) }' /proc/meminfo
}

load_average_1m() {
  awk '{ print $1 }' /proc/loadavg
}

assert_enough_resources() {
  if [ "${ALLOW_LOW_MEMORY_BUILD:-0}" = "1" ]; then
    echo "已跳过内存保护检查。"
    return
  fi

  local available_mb load_1
  available_mb="$(available_memory_mb)"
  load_1="$(load_average_1m)"

  echo "当前可用内存: ${available_mb}MB"
  echo "当前 1 分钟负载: ${load_1}"

  if [ "$available_mb" -lt "$MIN_AVAILABLE_MB" ]; then
    echo "可用内存低于 ${MIN_AVAILABLE_MB}MB，停止发布，避免服务器 OOM。"
    echo "临时强制构建可执行: ALLOW_LOW_MEMORY_BUILD=1 ./deploy.sh"
    exit 1
  fi

  if awk "BEGIN { exit !($load_1 > $MAX_LOAD_1) }"; then
    echo "系统负载高于 ${MAX_LOAD_1}，停止发布，避免压垮服务器。"
    exit 1
  fi
}

restore_previous_build() {
  if [ -f "$ROLLBACK_MARKER" ] && [ -d "$PREVIOUS_NEXT" ]; then
    rm -rf "$APP_DIR/.next.failed"
    if [ -d "$APP_DIR/.next" ]; then
      mv "$APP_DIR/.next" "$APP_DIR/.next.failed"
    fi
    mv "$PREVIOUS_NEXT" "$APP_DIR/.next"
    rm -f "$ROLLBACK_MARKER"
    return
  fi

  if [ -d "$PREVIOUS_NEXT" ] && [ ! -d "$APP_DIR/.next" ]; then
    mv "$PREVIOUS_NEXT" "$APP_DIR/.next"
  fi
}

cleanup() {
  if [[ "$BUILD_ROOT" == "$APP_DIR"/.deploy-build* ]]; then
    rm -rf "$BUILD_ROOT"
  fi
}

on_exit() {
  local status=$?
  if [ "$status" -ne 0 ]; then
    restore_previous_build
    echo
    echo "发布失败，已尽量保留上一版构建产物。"
  fi
  cleanup
  exit "$status"
}

trap on_exit EXIT

(
  flock -n 9 || {
    echo "已有发布任务正在执行，退出。"
    exit 1
  }

  log "开始发布"
  cd "$APP_DIR"

  log "1. 检查服务器资源"
  assert_enough_resources

  log "2. 拉取最新代码"
  git pull --ff-only origin master

  log "3. 安装依赖"
  pnpm install --frozen-lockfile

  log "4. 准备隔离构建目录"
  rm -rf "$BUILD_DIR"
  mkdir -p "$BUILD_DIR"
  rsync -a --delete \
    --exclude ".git" \
    --exclude ".next" \
    --exclude ".next.new" \
    --exclude ".next.previous" \
    --exclude ".deploy-build" \
    --exclude "node_modules" \
    "$APP_DIR/" "$BUILD_DIR/"
  ln -s "$APP_DIR/node_modules" "$BUILD_DIR/node_modules"

  log "5. 生成 Prisma 客户端"
  cd "$BUILD_DIR"
  pnpm exec prisma generate

  log "6. 构建应用"
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm build

  log "7. 切换构建产物"
  rm -rf "$NEXT_NEW"
  mv "$BUILD_DIR/.next" "$NEXT_NEW"
  rm -rf "$PREVIOUS_NEXT"
  touch "$ROLLBACK_MARKER"
  if [ -d "$APP_DIR/.next" ]; then
    mv "$APP_DIR/.next" "$PREVIOUS_NEXT"
  fi
  mv "$NEXT_NEW" "$APP_DIR/.next"

  log "8. 重启服务"
  pm2 restart "$PM2_APP_NAME" --update-env
  rm -f "$ROLLBACK_MARKER"
  rm -rf "$PREVIOUS_NEXT"

  if [ "${CLEAR_NGINX_CACHE:-0}" = "1" ] && [ -d "/www/server/nginx/proxy_cache_dir" ]; then
    log "9. 清除 Nginx 缓存"
    rm -rf /www/server/nginx/proxy_cache_dir/*
  fi

  log "发布完成"
) 9>"$LOCK_FILE"
