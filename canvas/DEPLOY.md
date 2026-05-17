# CANVAS 部署说明

## 推荐方式

可以不用 Docker 部署。宝塔上有两条路：

- **省心方案**：Docker Compose，MySQL 和应用一起由 Compose 管。
- **非 Docker 方案**：宝塔安装 Node.js + MySQL + PM2/Nginx，应用直接跑在服务器上。

你既然想不用 Docker，就按下面的「宝塔非 Docker 部署」走。

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | MySQL 连接串，Docker Compose 默认：`mysql://canvas:canvas@mysql:3306/canvas` |
| `SESSION_SECRET` | ✅ | 用户 JWT 签名密钥，生成：`openssl rand -base64 32` |
| `ADMIN_USERNAME` | ✅ | 管理员用户名，默认 `admin` |
| `ADMIN_PASSWORD` | ✅ | 管理员初始密码，首次登录后可在后台修改 |
| `MYSQL_ROOT_PASSWORD` | ✅ | MySQL root 密码 |
| `MYSQL_DATABASE` | ✅ | MySQL 数据库名，默认 `canvas` |
| `MYSQL_USER` | ✅ | MySQL 应用用户，默认 `canvas` |
| `MYSQL_PASSWORD` | ✅ | MySQL 应用用户密码 |

其余配置（SMTP、OSS、中转站 API）通过 `/admin/settings` 页面在数据库中维护，无需写入环境变量。

## Git + 宝塔 PM2 部署

你的目标流程是：本地提交代码到 Git，服务器从 Git 拉代码，然后在服务器构建并用 PM2 运行。这个流程可以，下面按这个来。

### 1. 本地提交并推送代码

在本地项目目录提交：

```bash
cd e:/code/AiImage/canvas
git status
git add .
git commit -m "chore: prepare baota pm2 deployment"
git push
```

如果远程仓库还没配，先在 GitHub / Gitee 建仓库，然后执行：

```bash
git remote add origin <你的仓库地址>
git branch -M main
git push -u origin main
```

### 2. 服务器准备

- 宝塔面板已安装：Nginx、MySQL、PM2 管理器。
- Node.js 版本选择：`20.x` 或更高。
- 放行端口：`80`、`443`、`8888`。
- 推荐二级域名：`ai.storycine.store`，解析到服务器公网 IP：`111.229.210.98`。

### 3. 创建数据库

在宝塔 MySQL 里新建数据库：

```text
数据库名：canvas
用户名：canvas
密码：341015
访问权限：本地服务器
```

非 Docker 部署时数据库连接串使用本机 MySQL：

```bash
DATABASE_URL=mysql://canvas:你的数据库密码@127.0.0.1:3306/canvas
```

### 4. 服务器拉代码

在宝塔终端执行：

```bash
cd /www/wwwroot
git clone <你的仓库地址> canvas
cd /www/wwwroot/canvas
```

如果仓库是私有的，别在服务器上瞎输密码。用 SSH Key 或 GitHub/Gitee 的访问令牌。

确认这些文件在项目根目录：

```bash
package.json
pnpm-lock.yaml
ecosystem.config.cjs
prisma/
src/
.env.example
```

### 5. 安装依赖

在宝塔终端进入项目目录：

```bash
cd /www/wwwroot/canvas
corepack enable
corepack prepare pnpm@10.33.2 --activate
pnpm install --frozen-lockfile
```

如果 `corepack` 不可用，就先装 pnpm：

```bash
npm install -g pnpm@10.33.2
pnpm install --frozen-lockfile
```

### 6. 创建 `.env`

在项目目录复制模板：

```bash
cp .env.example .env
```

编辑 `.env`，至少改掉这些值：

```bash
DATABASE_URL=mysql://canvas:341015@127.0.0.1:3306/canvas
SESSION_SECRET=替换成随机长字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=替换成后台强密码
```

非 Docker 部署不需要在 `.env` 里写 `MYSQL_ROOT_PASSWORD`、`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`，这些由宝塔 MySQL 管。

生成 `SESSION_SECRET`：

```bash
openssl rand -base64 32
```

### 7. 构建应用

在项目目录执行：

```bash
pnpm prisma generate
pnpm build
pnpm prisma db push
```

如需导入 Gemini 模型种子数据：

```bash
pnpm db:seed:gemini
```

### 8. 用 PM2 启动

项目已经提供 `ecosystem.config.cjs`，服务器路径按 `/www/wwwroot/canvas` 配好了。

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

如果你不用配置文件，也可以手动启动：

```bash
npm install -g pm2
NODE_ENV=production PORT=3000 HOSTNAME=127.0.0.1 pm2 start .next/standalone/server.js --name canvas
```

### 9. 配置反向代理

宝塔创建站点，域名填：

```bash
ai.storycine.store
```

站点目录可以指向 `/www/wwwroot/canvas`。

在站点设置里开启反向代理：

- 目标 URL：`http://127.0.0.1:3000`
- 发送域名：`$host`
- 开启 WebSocket 支持

建议在反向代理配置里确认包含：

```nginx
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
```

### 10. 开启 HTTPS

在宝塔站点 SSL 中申请 Let's Encrypt 证书，并开启强制 HTTPS。生产环境必须走 HTTPS，不然登录态 Cookie、安全回调这些问题迟早炸。

### 11. 访问后台

浏览器打开：

```bash
https://ai.storycine.store/admin/login
```

使用 `.env` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 登录后配置：

- SMTP 邮件发送
- OSS 图片存储
- 中转站 API / 生图模型
- 积分单价
- 充值码

## 健康检查

```bash
curl http://localhost:3000/api/health
```

返回示例：

```json
{ "status": "ok", "checks": { "db": "ok" } }
```

- `ok`：所有服务正常
- `degraded`：数据库正常但其他服务异常，应用可用但部分功能受限
- `down`：数据库不可达，HTTP 503

## 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs canvas

# 重启应用
pm2 restart canvas

# 停止应用
pm2 stop canvas

# 更新代码后重建
git pull
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
pnpm prisma db push
pm2 restart canvas
```

## 备份建议

- **数据库**：每日备份 Docker 卷或执行 `mysqldump`，至少保留 7 天。
- **OSS**：开启阿里云 OSS 跨区域复制（CRR），或定期用 `ossutil` 同步到备份 bucket。
- **环境变量**：`.env` 单独备份，不要提交到代码仓库。

## 排错

- `SESSION_SECRET is required`：`.env` 没写 `SESSION_SECRET`，或者 PM2 启动目录不在项目根目录。
- 数据库连不上：检查宝塔 MySQL 是否已启动、数据库用户是否是 `canvas`、`DATABASE_URL` 是否为 `mysql://canvas:341015@127.0.0.1:3306/canvas`。
- 后台登录失败：确认 `ADMIN_USERNAME` / `ADMIN_PASSWORD`，如果后台改过密码，数据库配置优先于环境变量。
- 上传失败或 413：宝塔 Nginx 增加 `client_max_body_size 20M;`。
- 页面能开但接口异常：先看 `pm2 logs canvas`，再访问 `/api/health`。
- PM2 启动后访问不到：确认启动命令里有 `HOSTNAME=127.0.0.1 PORT=3000`，反向代理目标是 `http://127.0.0.1:3000`。
