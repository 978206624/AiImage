#!/bin/bash

set -e

echo "=== 开始发布 ==="

cd /www/wwwroot/aiImage/AiImage/canvas

# 拉取最新代码
echo "1. 拉取最新代码..."
git pull origin master

# 安装依赖
echo "2. 安装依赖..."
pnpm install

# 重新生成 Prisma 客户端
echo "3. 生成 Prisma 客户端..."
npx prisma generate

# 清除缓存并构建
echo "4. 清除缓存并构建..."
rm -rf .next
pnpm build

# 清除 Nginx 缓存
echo "5. 清除 Nginx 缓存..."
rm -rf /www/server/nginx/proxy_cache_dir/*

# 重启 PM2
echo "6. 重启服务..."
pm2 restart aiimage-canvas

echo "=== 发布完成 ==="
