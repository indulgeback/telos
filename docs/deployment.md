# Telos 部署指南

本文档说明如何通过 GitHub Actions 自动构建镜像、推送到 GHCR,并通过 SSH 自动部署到服务器。

---

## 架构总览

```
┌─────────────┐  push main/tag       ┌──────────────────┐
│  Developer  │ ───────────────────▶ │  GitHub Actions  │
└─────────────┘                      │  (docker-build)  │
                                     └────────┬─────────┘
                                              │ push images
                                              ▼
                                     ┌──────────────────┐
                                     │      GHCR        │
                                     │ ghcr.io/.../...  │
                                     └────────┬─────────┘
                                              │ trigger
                                              ▼
┌─────────────┐  SSH + deploy.sh     ┌──────────────────┐
│   Server    │ ◀─────────────────── │  GitHub Actions  │
│ /opt/telos  │                      │    (deploy)      │
└─────────────┘                      └──────────────────┘
```

### 流水线一览

| Workflow | 触发 | 作用 |
|----------|------|------|
| `docker-build.yml` | push `main` / 打 `v*` tag / 手动 | matrix 并发构建 4 个镜像,推送 GHCR |
| `deploy.yml` | 构建完成后自动 / 手动 | SSH 到服务器执行 `deploy.sh` |
| `basic-checks.yml` | push / PR | lint + 单元构建 (原有,未改动) |

### 镜像与 Tag 策略

- **镜像地址**:`ghcr.io/indulgeback/telos-{web,agent-service,api-gateway,registry}`
- **Tag 规则**:
  - 推 `main` → `:main` + `:sha-<7位>`
  - 打 tag `v1.2.3` → `:1.2.3` + `:latest`

---

## 一、首次配置 (只需做一次)

### 1. 在 GitHub 仓库配置 Secrets

进入 **Settings → Secrets and variables → Actions → New repository secret**:

| Secret 名 | 说明 | 示例 |
|-----------|------|------|
| `SSH_HOST` | 服务器 IP 或域名 | `1.2.3.4` 或 `telos.example.com` |
| `SSH_USER` | SSH 登录用户名 | `root` 或 `deploy` |
| `SSH_PRIVATE_KEY` | SSH 私钥完整内容 | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `SSH_HOST_KEY` *(可选)* | 服务器主机公钥指纹 | `telos.example.com ssh-ed25519 AAAA...` |

#### 生成 SSH 密钥对

**在本地执行**(生成专用部署密钥,不要复用个人密钥):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/telos_deploy
# 一路回车,不设密码(否则 Actions 无法用)
```

- **私钥** `~/.ssh/telos_deploy`:粘贴到 GitHub 的 `SSH_PRIVATE_KEY`(完整内容,含首尾标记)
- **公钥** `~/.ssh/telos_deploy.pub`:追加到服务器的 `~/.ssh/authorized_keys`

```bash
# 把公钥拷到服务器
ssh-copy-id -i ~/.ssh/telos_deploy.pub deploy@your-server-ip
# 测试免密登录
ssh -i ~/.ssh/telos_deploy deploy@your-server-ip "echo ok"
```

#### 关于 `SSH_HOST_KEY`(可选但推荐)

不配置时,deploy workflow 会用 `ssh-keyscan` 自动添加。配置它可避免 MITM 风险:

```bash
ssh-keyscan -H your-server-ip
```

### 2. 在 GitHub 配置 Variables (可选)

**Settings → Secrets and variables → Actions → Variables tab**:

| Variable | 默认值 | 说明 |
|----------|--------|------|
| `DEPLOY_DIR` | `/opt/telos` | 服务器上部署目录路径 |

### 3. 服务器初始化

```bash
# 1) 登录服务器
ssh deploy@your-server-ip

# 2) 安装 Docker + Compose 插件 (如已装可跳过)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # 然后重新登录

# 3) 创建部署目录并拉取仓库
sudo mkdir -p /opt/telos && sudo chown $USER:$USER /opt/telos
cd /opt/telos
git clone https://github.com/indulgeback/telos.git .   # 或用 ssh

# 4) 准备 .env (绝不进 git)
cp deploy/.env.example .env
chmod 600 .env
vim .env   # 按下面"必填项"修改
```

### 4. `.env` 必填项检查清单

打开 `/opt/telos/.env`,确认以下变量已填入真实值(留 `=` 后为空会启动失败):

- [ ] `POSTGRES_PASSWORD` — 数据库密码(`openssl rand -base64 24`)
- [ ] `BETTER_AUTH_SECRET` — Auth 密钥(`openssl rand -base64 32`)
- [ ] `BETTER_AUTH_URL` — Web 对外访问 URL(如 `https://telos.example.com`)
- [ ] `NEXT_PUBLIC_API_URL` — 浏览器能访问的 API 网关地址
- [ ] `GATEWAY_INTERNAL_SECRET` — 内部服务通信密钥(`openssl rand -hex 32`)
- [ ] `GHCR_TOKEN` — GitHub PAT,需 `read:packages` 权限(若仓库/镜像私有)
- [ ] 至少一个 LLM API Key(如 `DEEPSEEK_API_KEY`)

---

## 二、日常发布流程

### 自动发布(推荐)

```bash
# 本地
git push origin main
# → GitHub Actions 自动构建镜像 → 自动部署到服务器
```

查看进度:仓库 **Actions** 标签页。

### 发布稳定版

```bash
git tag v1.0.0
git push origin v1.0.0
# → 构建 :1.0.0 + :latest 标签 → 部署
```

### 手动触发

仓库 **Actions → Build & Push Docker Images → Run workflow**,可选指定分支/tag/commit。

---

## 三、回滚

在 **Actions → Deploy to Server → Run workflow**,输入要回滚到的旧 tag:

```
image_tag: sha-abc1234   # 或 main / 1.0.0
```

也可以直接在服务器执行:

```bash
cd /opt/telos
./deploy/deploy.sh sha-abc1234
```

---

## 四、服务器侧常用运维命令

```bash
cd /opt/telos

# 查看运行状态
docker compose -f docker-compose.prod.yml ps

# 查看某服务日志 (实时)
docker compose -f docker-compose.prod.yml logs -f web

# 重启某个服务
docker compose -f docker-compose.prod.yml restart agent-service

# 手动部署 / 回滚到指定 tag
./deploy/deploy.sh <tag>

# 进入数据库
docker compose -f docker-compose.prod.yml exec postgres psql -U telos

# 查看磁盘占用
docker system df
```

---

## 五、首次部署后:数据库初始化

镜像首次启动时,需要执行 Prisma migration 把表结构建出来。**任选一种方式**:

### 方式 A:在 web 容器里跑(推荐,已有 prisma client)

```bash
cd /opt/telos
docker compose -f docker-compose.prod.yml exec web npx prisma db push
# 或如果有 migration 文件:
# docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

### 方式 B:agent-service 里跑(若 schema 共享)

```bash
docker compose -f docker-compose.prod.yml exec agent-service \
  node node_modules/prisma/build/index.js db push
```

> ⚠️ 注意 `pgvector` 扩展需要在数据库中先创建。pgvector 镜像已内置,但若手工迁移:
> ```sql
> CREATE EXTENSION IF NOT EXISTS vector;
> ```

---

## 六、文件结构参考

```
telos/
├── .github/workflows/
│   ├── basic-checks.yml        # 原 lint/build 检查 (未改动)
│   ├── docker-build.yml        # 新增:构建并推送镜像
│   └── deploy.yml              # 新增:SSH 部署
├── deploy/
│   ├── deploy.sh               # 新增:服务器部署脚本
│   └── .env.example            # 新增:环境变量模板
├── docker-compose.yml          # 开发用 (本地 build,未改动)
├── docker-compose.prod.yml     # 新增:生产用 (image: 拉 GHCR)
└── docs/deployment.md          # 本文件
```

---

## 七、故障排查

### 构建失败

进入 Actions 页面查看具体 job 日志。常见原因:
- Dockerfile 本身有问题 → 在本地 `docker build` 复现
- pnpm lockfile 不匹配 → 本地 `pnpm install` 后提交 lockfile

### 部署失败:SSH 连不上

- 确认 `SSH_HOST`、`SSH_USER`、`SSH_PRIVATE_KEY` 三个 Secret 都已配置
- 私钥格式要完整,含 `-----BEGIN ... PRIVATE KEY-----` 首尾
- 在本地用同样的私钥测试:`ssh -i <私钥> <用户>@<服务器>`

### 部署失败:服务不健康

deploy.sh 会自动打印失败服务的最近 80 行日志。SSH 到服务器深入排查:

```bash
cd /opt/telos
docker compose -f docker-compose.prod.yml ps           # 看哪个 unhealthy
docker compose -f docker-compose.prod.yml logs web     # 看日志
```

常见原因:
- `.env` 必填项没填 → 容器启动后立即 crash
- 数据库还没初始化 → 跑一次 prisma db push
- 端口被占用 → 改 `.env` 里的 `WEB_PORT` 等

### 拉镜像失败:401

仓库/镜像是私有时需要 `GHCR_TOKEN`。生成 Classic Token:
1. https://github.com/settings/tokens/new
2. 勾选 `read:packages`
3. 把 token 粘贴到服务器 `/opt/telos/.env` 的 `GHCR_TOKEN=`

---

## 八、安全建议

1. **服务器上的 `.env` 权限设为 600**:`chmod 600 /opt/telos/.env`
2. **定期轮换密钥**:`BETTER_AUTH_SECRET`、`GATEWAY_INTERNAL_SECRET`、`GHCR_TOKEN`
3. **SSH 用专用密钥**:不要复用个人日常登录密钥
4. **数据库不对外暴露**:`.env` 中 `EXPOSE_DB_PORT` 留空
5. **HTTPS**:在生产前用 Nginx/Caddy 反向代理 `WEB_PORT` 与 `API_GATEWAY_PORT`,配证书
