# CANVAS 部署说明

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | MySQL 连接串，格式：`mysql://user:pass@host:3306/canvas` |
| `SESSION_SECRET` | ✅ | 用户 JWT 签名密钥，生成：`openssl rand -base64 32` |
| `ADMISSWORD` | ✅ | 管理员初始密码（首次登录后可在后台修改） |

其余配置（SMTP、OSS、中转站 API）通过 `/admin/settings` 页面在数据库中维护，无需写入环境变量。

## 首次启动

```bash
# 1. 复制环境变量模板
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL、SESSION_SECRET、ADMIN_PASSWORD

# 2. 启动服务
docker compose up -d

# 3. 等待 MySQL 就绪后执行数据库迁移
docker compose exec app npx prisma db push

# 4. 访问管理后台配置
# 浏览器打开 http://your-domain/admin/login
# 使用 ADMIN_PASSWORD 登录后依次配置：
#   - SMTP（邮件发送）
#   - OSS（图片存储）
#   - 中转站 API（GPT Image 生图）
#   - 积分单价

# 5. 生成充值码
# 在 /admin/keys 页面批量生成充值码
```

## Cookie 配置

生产环境如使用自定义域名，确保：

- 反向代理正确透传 `X-Forwarded-Proto: https`
- Next.js 会自动根据请求协议设置 cookie 的 `Secure` 标志
- 如需跨子域共享 session，在 `c-session.ts` 中配置 cookie domain

## Nginx 反向代理示例

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

## 备份建议

- **数据库**：每日 `mysqldump` 全量备份，保留 7 天
  ```bash
  mysqldump -u canvas -p canvas > backup_$(date +%Y%m%d).sql
  ```
- **OSS**：开启阿里云 OSS 跨区域复制（CRR），或定期用 ossutil 同步到备份 bucket
- **环境变量**：`.env` 文件单独备份，不要放在代码仓库中

## 健康检查

```bash
curl http://localhost:3000/api/health
# 返回：{ "status": "ok"|"degraded"|"down", "checks": { "db", "smtp", "gptImage", "oss" } }
```

- `ok`：所有服务正常
- `degraded`：数据库正常但其他服务异常（应用可用但部分功能受限）
- `down`：数据库不可达（HTTP 503）

## 更新部署

```bash
git pull
docker compose build app
docker compose up -d app
# 如有数据库变更：
docker compose exec app npx prisma db push
```
