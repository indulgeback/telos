# Telos 生产环境服务器迁移方案

> 从当前服务器（4C / 3.6G 可用内存 / 40G 盘，以下称**旧机**，IP `211.159.161.34`）
> 迁移到腾讯云轻量应用服务器（2C / 4G / 5M 带宽 / 60GB SSD，以下称**新机**）。
>
> 状态：方案定稿，等待新机就绪后按 `deploy/migration/` 脚本序列执行。

## 1. 现状盘点（2026-10-30 实测）

### 1.1 资源水位（旧机）

| 项 | 实测值 | 2C4G 新机评估 |
|---|---|---|
| CPU | 全部 19 容器合计 <3%（重活全在外部 API） | ✅ 富余 10 倍以上 |
| 内存 | 已用 2.1G / 3.6G（可用 1.6G） | ⚠️ 不增不减，需加 swap 兜底（见 §7） |
| 磁盘 | 已用 ~33G / 40G（大头是 Docker 镜像层） | ✅ 60GB 更宽裕 |
| 带宽 | 聊天为文本流，图片/文件走 COS 直连不经服务器 | ✅ 5M 足够；仅生图 fallback 转存时过一手（每张数 MB） |

### 1.2 需迁移的组件清单（逐项标注迁移方式）

| 组件 | 位置（旧机） | 体量 | 迁移方式 |
|---|---|---|---|
| Telos compose + .env | `/opt/telos/docker-compose.prod.yml`、`/opt/telos/.env` | ~25KB | 打包直传（.env 已含全部密钥，传输后校验 sha256，落地 chmod 600） |
| **PostgreSQL 数据**（唯一权威数据） | named volume `postgres_data`（pgvector/pg16，库名/账号见 .env 的 POSTGRES_*） | 随业务增长 | `pg_dump -Fc` 冷备 + 新机 restore（脚本 01/03） |
| Telos workspaces | `/opt/telos/workspaces`（bind mount，实测仅 4KB，接近空） | 极小 | 打包直传 |
| GCP ADC 凭据 | `/opt/telos/secrets/gcp-adc.json` | <1KB | 打包直传（生图主通道依赖） |
| Redis 数据 | named volume `redis_data` | 小 | **不迁移**（内容为缓存/BullMQ 队列/nonce/租约，全部可重建；迁移反而会把旧机的 in-flight 任务带过去） |
| Consul 数据 | named volume `consul_data` | 小 | **不迁移**（服务自注册 + 30s 周期重注册，新机起服务即重建） |
| 镜像 | ghcr.io/indulgeback/telos-*（当前 tag `sha-c382928`） | — | 新机优先 `docker pull`；ghcr 劣化时走 `.github/workflows/relay-image.yml` 中继（已验证）；最终兜底旧机 `docker save` 打包直传 |
| **SafeLine WAF 全套** | `/data/safeline`（compose + .env + resources 含 nginx 证书 cert_1.crt/key_1.key + postgres 数据，**325M**） | 325M | 整目录打包直传（其中 safeline-pg 的数据在 resources/postgres/data，直接随目录走） |
| rustdesk 中继 | `/opt/rustdesk/data`（bind → /root） | 2M | 打包直传 |
| mihomo 代理 | `/opt/mihomo`（二进制 + config.yaml 517KB）+ systemd unit `mihomo.service` | 44M | 打包直传（unit 文件内容见脚本 02，按旧机 `systemctl cat mihomo` 复刻） |

**不迁移**：Docker 镜像层缓存、容器日志、`/opt/telos/deploy/backups`（旧备份留在旧机作为回滚保险）。

### 1.3 端口清单

| 端口 | 用途 | 来源 |
|---|---|---|
| 22 | SSH | 系统 |
| 80 / 443 | SafeLine tengine（流量总入口，当前直接监听宿主机） | `/data/safeline` compose |
| 9443 | SafeLine 管理控制台 | 同上 |
| 8890 | api-gateway（5M 带宽下经雷池转发即可，不必公网开） | compose |
| 8800 / 8082 | web / admin（同理，经雷池反代） | compose |
| 5432 | postgres（**仅绑 127.0.0.1**，不公网开） | compose（host_ip 默认 127.0.0.1） |
| 8500 | consul UI（`CONSUL_UI_PORT` 默认空 = 不发布） | compose |

新机安全组只需开：**22 / 80 / 443 / 9443**。其余端口一律不开（Telos 各服务经雷池反代对外，内部走 docker 网络）。

### 1.4 外部依赖与回调核对（切 DNS 前过一遍）

| 依赖 | 核对项 |
|---|---|
| DNSPod 域名 `indulgeback.icu` | 2026-11-18 到期，**迁移前先续费**；切 A 记录前 24h 把 `telos` 记录 TTL 降到 60s |
| 腾讯云 COS（telos-1329782584） | 域名式访问，与服务器 IP 无关，无需改 |
| GitHub OAuth App | 回调是域名不是 IP，无需改；确认 new 机可访问 github.com（走 mihomo） |
| 火山方舟 / 百炼 / DeepSeek / 智谱 | 均为域名鉴权，无需改 |
| mihomo 订阅 | `PROXY_SUB_URL` 在 GitHub Secret，新机 mihomo 起来后确认订阅拉取正常 |

## 2. 新机预购检查单

- [ ] SKU **非突发/积分型**（页面标"超强性能加持"的通常是非积分型；积分型持续低载虽够用，但避免踩坑）
- [ ] Ubuntu LTS 版本（与旧机一致为佳，≥22.04）
- [ ] 地域北京/上海/广州任一（与 COS ap-beijing 的内网加速不跨区也无所谓，走公网量小）
- [ ] 系统盘 60GB SSD ✓
- [ ] 安全组入站：22（限自己的 IP 更佳）/ 80 / 443 / 9443
- [ ] 购买后拿到：公网 IP、root 密码或 SSH 密钥

## 3. 执行序列（脚本对应关系）

```
准备期（切 DNS 前 1-2 天，旧机在线无影响）
  02-init-new-server.sh   # 新机：swap/docker/目录骨架/mihomo/SSH 加固
  （首次）03-restore-on-new.sh  # 试运行恢复 + 全量验证，此时还不切流量

切换窗口（建议低峰，预计停机 < 30 分钟）
  01-export-from-old.sh   # 旧机冷备导出（Telos 先 docker compose stop 保证数据一致）
  —— 传输 export 包到新机（scp/rsync，经本机中转）——
  03-restore-on-new.sh    # 正式恢复 + 按序启动 + 健康门禁
  04-verify-all.sh        # 端到端冒烟（此时可用 hosts 文件绑新 IP 先验）
  DNS 切 A 记录（TTL 60s）→ 公网生效
  04-verify-all.sh 再跑一遍（走公网域名）

回滚（任一验证不过）
  DNS 切回旧 IP（旧机全程未动，秒级回滚）→ 05-rollback.sh 收尾核对
```

**停机窗口估算**：pg_dump+传输+restore 在当前库体积下 < 15 分钟，加 SafeLine 与验证共约 30 分钟。

## 4. 新机初始化要点（脚本 02 覆盖）

1. **swap 4G**（`/swapfile`，swappiness=10）——4G 内存无升级，防高峰 OOM 的关键
2. Docker + compose plugin（官方 apt 源）
3. `/opt/telos`、`/data/safeline`、`/opt/mihomo`、`/opt/rustdesk/data` 目录骨架
4. mihomo：恢复 config 后装 systemd unit（After=network-online.target，multi-user.target）
5. SSH 加固：禁密码登录（可选）、装 fail2ban（可选，雷池在前也行）
6. 时区 Asia/Shanghai（与旧机一致，保证日志/定时任务可读）

## 5. 启动顺序与依赖（脚本 03 的门禁序列）

```
postgres → redis → consul → registry → agent-worker → agent-service
          → api-gateway → web → admin-service → admin
   （每步等 compose healthcheck healthy 或端口就绪，超时中止）
之后独立启动：SafeLine（最后接流量）→ rustdesk
mihomo 在最前（新机出网依赖，web 构建/ghcr 拉取/Google ADC 都要它）
```

依赖依据：registry 是服务发现源头；gateway 经 registry 发现下游；agent-service 就绪后 gateway 的路由才有后端；web 依赖 gateway；SafeLine 是所有流量的前置。

## 6. 域名切换

1. 切换前 24h：DNSPod 把 `telos.indulgeback.icu`（及所有相关子域）TTL 降到 60s
2. 新机验证通过后：改 A 记录指向新 IP
3. 生效观察：`dig +short telos.indulgeback.icu` 全网生效通常 < 5 分钟（TTL 60s）
4. 回滚 = 把 A 记录改回旧 IP（旧机全程保持运行，这是整个方案的兜底）

## 7. 风险与内存预算

| 服务 | 实测内存 | 预算说明 |
|---|---|---|
| web | 139M | |
| agent-service | 118M | 流式会话多时略涨 |
| agent-worker | 122M | 并发 run 多时略涨（BullMQ 并发可调） |
| SafeLine 全家 | ~180M | |
| postgres/redis/consul/gateway/registry | ~110M | |
| admin/admin-service | ~30M | |
| rustdesk | ~8M | |
| 系统 + buff/cache | ~400M | |
| **合计** | **~1.9-2.1G** | 4G 内存 + 4G swap 下余量充足 |

可裁剪项（若内存紧张）：admin + admin-service（暂无日常运维需求可先不起）、rustdesk（可迁回个人设备）。

主要风险与对策：
- **内存 OOM**：swap 兜底 + `docker compose up -d --scale agent-worker=1` 明确单 worker
- **5M 带宽突发**：图片走 COS、聊天为文本，无大流量路径；生图 fallback 转存单张 ≤15M 且低频
- **ghcr 拉取失败**：relay-image.yml 中继（已验证）或旧机 save/load 打包
- **数据不一致**：严格"旧机 compose stop → pg_dump → 传输 → restore"冷备序列，不做双写

## 8. 回滚预案

- 旧机**不退订、不清理**，保持运行 ≥7 天观察期
- 回滚 = DNSPod 把 A 记录改回旧 IP（TTL 已是 60s，生效 <2 分钟）+ `05-rollback.sh` 核对旧机服务状态
- 观察期内新机产生的新数据（如果有少量会话）以新机为准做一次增量 pg_dump 回灌旧机（可选，通常观察期流量极小可忽略）

## 9. 演练实录与踩坑（2026-11-17，新机已就绪并完成初始化+演练）

新机（SSH alias `tencent-new`，2C/4G/60G，Ubuntu 26.04 LTS）已完成：02 初始化（Docker 29.10、6G swap、swappiness=10）、mihomo 迁移部署（含 docker daemon 代理 drop-in）、导出演练、47M 迁移包传输（sha256 全程校验通过）。演练中踩到的坑，正式切换前必读：

1. **`.env` 必含 compose 全部 `:?` 强制变量**：`WORKSPACE_SHARE_BASE_URL=https://api.telos.indulgeback.icu` 曾只在 CI 部署时注入、没落进服务器 .env，导致任何手动 `docker compose` 命令在插值阶段直接失败（stop 都执行不了）。已补进旧机 .env 并随迁移包带到新机；其余 7 个强制变量核对无缺。
2. **01 脚本必须脱离终端执行**（`setsid nohup ... &`）：ssh 断开会连带杀掉脚本，曾把 6 个 Telos 服务停在半路无人拉起。脚本已加 `trap EXIT` 兜底恢复，但别依赖兜底当常规路径。
3. **镜像 tag 跟随旧机当前运行版本**：push main 会自动触发 Build & Push → Deploy，旧机 tag 随每次推送前移（演练时为 `sha-bd82a36`）。正式切换前用 `docker ps --format "{{.Names}}\t{{.Image}}"` 确认当前 tag，再以 `IMAGE_TAG=sha-xxx` 跑 03 脚本。
4. **雷池对 HTTPS 上的 curl 类 TLS 指纹（JA3）按 Bot 拦截**：返回"访问已被拦截/请求存在恶意行为"403 页面；80 端口无 TLS 指纹不受影响（SQL 注入探针仍正常拦截）。**curl 403 ≠ 站点故障**——判定存活必须用真实浏览器（演练时为此空查了 40 分钟）。04 脚本的 `--public` 模式已加此警告。
5. **雷池快速 stop/start 后新容器解析不到 `safeline-pg`**（Docker 内嵌 DNS 注册失效，报 "server misbehaving"，跑了很久没重启过的 pg 最易踩）：重启 `safeline-pg` 即修复。旧机演练时 mgt/luigi 曾因此崩溃循环 ~3 分钟。
6. **雷池里还有第三个站点 `ollama.indulgeback.icu`**（反代 127.0.0.1:11434 的本地 Ollama，本机并无该服务，一直 502）——随 safeline.tgz 一起迁移；新机上同样无后端，属预期。宝塔面板按用户要求**原样迁移**（新装面板 + 拷 panel data，见 §10.0）。
7. SafeLine 内部网络 192.168.0.x 的容器 IP（detector .5:8000 / mgt .4 / chaos .10）写死在 tengine 容器 env 与 safeline.conf 里，整套随包迁移后自洽；勿单独重建其中某个容器导致 IP 漂移。
8. **旧机 telos `.env` 里残留 `IMAGE_TAG=main`**（历史部署遗留）：脚本 03 `source` 该 .env 后若不覆盖，会连带把 SafeLine compose 的 IMAGE_TAG 也毒化成 main（SWR 上不存在，恢复即失败）。03 已改为 source 后无条件覆盖 + SafeLine 段读它自己 .env 的版本锁（当前 9.4.2）。正式切换时用 `TELOS_IMAGE_TAG=sha-<旧机当前tag>` 传入。
9. **01 脚本的 RUSTDESK_DATA 曾指向 `/opt/rustdesk/data` 子目录**：basename 后只打包了 data、丢掉了 compose 文件（与注释"整目录"不符），已修为 `RUSTDESK_DIR=/opt/rustdesk` 整目录。演练包缺 compose，已从旧机补传——正式切换跑 01 时已是修好的版本。

**演练终态**：新机 19 容器全部 healthy（10 Telos + 7 SafeLine + 2 rustdesk），`04-verify-all.sh` 本地模式全绿（含 A2A 聊天端到端冒烟，DeepSeek 真实调用走通）；内存 1.8G/3.6G（swap 未动用）、磁盘 19G/59G；雷池 80/443 反代链路 200。镜像 tag 演练用 main（与 bd82a36 代码等价），正式切换时钉 TELOS_IMAGE_TAG。


## 10. 域名切换方案（2026-11-17 增补：新购 `indulgeback.org`）

用户已购新域名并指往新机——**切换形态从"停机切 A 记录"升级为零停机**：新域名直接指向新机（旧域名继续在旧机服务至到期）。**子域规划：原结构镜像，不重设计**——`telos.indulgeback.org`（主站）/ `api.telos.indulgeback.org`（网关）/ `ollama.indulgeback.org`（原样保留的遗留站）。新机公网 IP `43.166.132.158`，位于**腾讯云美东（na-ashburn-2）——无需 ICP 备案**；注意境外机对国内用户延迟 ~150-250ms RTT。

### 10.0 全量服务清单（2026-11-17 全盘盘点，逐项对账）

| 服务 | 旧机形态 | 迁移状态 |
|---|---|---|
| Telos 19 容器组 | compose + volumes | ✅ 已迁（04 验证全绿） |
| SafeLine 全套（3 站点+证书+数据） | /data/safeline | ✅ 已迁（镜像 9.4.2） |
| mihomo + systemd + docker 代理 | /opt/mihomo | ✅ 已迁 |
| rustdesk | /opt/rustdesk | ✅ 已迁 |
| **frps**（FRP 服务端，7100 客户端 / 7102 面板） | /usr/local/frp + systemd | ✅ 已迁（active） |
| **hermes**（用户 agent 网关，6.1G，gateway run + 9119 dashboard） | /home/ubuntu/.hermes | 🔄 6.1G 流式中转 |
| **宝塔面板 11.7**（:29505，无挂站，仅证书续期 cron ×2） | /www/server | ❌ **不迁移**（2026-11-17 用户拍板"干脆别整"：官方安装器在境外机反复异常，且核实面板内零业务数据——wwwroot 仅模板、备份空、项目目录全空；两个 cron 是面板自身的证书续期任务） |
| 腾讯云平台代理（tat_agent/stargate/yunjing） | 平台自带 | 不迁（新机有自己的） |

**新机轻量防火墙需放行**：22 / 80 / 443 / 9443（雷池）/ 7100、7102（frps）/ 21115-21119（rustdesk）/ 9119（hermes dashboard）。

> DNS 实测：旧域名 6 条 A 记录全指旧机（apex/www/telos/api.telos/ollama/mail），无 MX/TXT（无邮件栈）；apex 与 mail 无对应站点（404/死记录），`admin.telos` 无解析（CORS 里的 admin 域名处于休眠）。COS 用默认 `*.myqcloud.com` 域名，与 .icu 无关，存量图片 URL 不受换域名影响。

### 10.1 域名触点清单（改域名要动的全部位置）

| 位置 | 现值 | 新值 | 谁动 |
|---|---|---|---|
| DNS 记录 | — | `telos`/`api.telos`/`ollama` A → 43.166.132.158（与旧域名实际使用的解析一一镜像） | 用户 |
| GitHub OAuth App 回调 | `...icu/api/auth/callback/github` | `https://telos.indulgeback.org/api/auth/callback/github` | 用户（GitHub 控制台） |
| SafeLine 站点 ×2-3 | — | telos.→127.0.0.1:8800、api.telos.→8890、ollama.→11434（原样） | 用户控制台（9443）或给密码 |
| TLS 证书 | cert_1 只含 *.icu | 控制台对新站一键申请 Let's Encrypt（HTTP-01，DNS 生效后） | 同上 |
| web 镜像构建变量 | `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_BETTER_AUTH_URL`（**构建时烘焙进 bundle**） | 改 GitHub repo variables → 重跑 Build & Push | 我（gh variable set） |
| 新机 `/opt/telos/.env` | `BETTER_AUTH_URL`/`WORKSPACE_SHARE_BASE_URL`/`CORS_ORIGINS`/`BETTER_AUTH_COOKIE_DOMAIN`/`ADMIN_CORS_ORIGINS` | `.org` 镜像值（`BETTER_AUTH_COOKIE_DOMAIN=indulgeback.org`），`docker compose up -d` 重建相关容器 | 我 |
| hermes 启动参数 | `--host hermes.indulgeback.icu` | 先在 /etc/hosts 镜像原条目原样跑，域名定后再改 `.org` | 我 |
| deploy CI 目标机 | SSH 211.159.161.34（旧机） | 切换后部署目标改新机（secret 换 host + 新机装 Actions 公钥） | 我 |
| COS / 数据库图片 URL | 自有 COS 域名 | **不受影响** | — |

### 10.2 执行顺序（DNS 生效为分界）

1. 用户：加 DNS 记录（`telos`/`api.telos`/`ollama`，TTL 60s）+ GitHub OAuth 回调改新域名 + 轻量防火墙放行端口清单（见 10.0）
2. DNS 生效后：SafeLine 控制台建镜像站点 → 申请证书（雷池一键，HTTP-01 验证需 80 可达——新机 tengine 已在）
3. 我：`gh variable set` 两个构建变量（镜像 .org 值）→ 重跑 Build & Push（新 web 镜像带新域名 bundle）
4. 我：新机 .env 五项改 `.org` → `up -d` 重建 web/gateway/agent-service/admin
5. 验收：浏览器走通 注册/登录/GitHub 登录/聊天流式/生图/语音；`04-verify-all.sh --public`（域名改新值后）
6. 旧域名若续费：旧机雷池加 301 `telos.indulgeback.icu → telos.indulgeback.org`（保 SEO 权重）；不续费则到期自然失效
7. 收尾：deploy CI 目标机切新机，旧机进入 ≥7 天只读观察期

### 10.3 迁移完成态（2026-11-18 实际执行记录，与 10.2 规划的差异点）

实际落地结构（用户拍板）：**Cloudflare 橙云代理 + Automatic SSL（运行 Full）**，域名三条：
`telos.indulgeback.org`（web）/ `api-telos.indulgeback.org`（网关）/ `ollama.indulgeback.org`（frp 隧道，frp 客户端连上即活）。

- **证书**：绕过雷池控制台，手工 `certbot certonly --standalone`（短暂 stop tengine）签出三域名一证
  （`/etc/letsencrypt/live/telos.indulgeback.org/`，至 2027-02-16），复制到 `resources/nginx/certs/telos-org.*`。
  ⚠️ **续期需挂 cron**：standalone 续期须再停/起 tengine（`prehook stop` + `posthook start`），90 天内务必配置。
- **站点**：手写 `resources/nginx/sites-enabled/IF_backend_10/11/12`（从 IF_backend_8 模板 sed 派生，
  + 空文件 `custom_params/backend_10/11/12`），`nginx -s reload` 生效。控制台 DB 里没有这三个站（mgt 重新生成站点时可能覆盖手写文件——届时在控制台补建同名站点即可）。
- **部署链路**：`SSH_HOST` secret 已切 `43.166.132.158`，CI 专用密钥对已换（公钥在新机 ubuntu authorized_keys），
  `/opt/telos` 属主 chown ubuntu。**push main → Build & Push → 自动 Deploy → 新机**。
- **新机 `.env` 域名相关已全部 .org**：CORS_ORIGINS / TRUSTED_ORIGINS（含 api-telos）/ BETTER_AUTH_URL /
  BETTER_AUTH_COOKIE_DOMAIN=indulgeback.org / WORKSPACE_SHARE_BASE_URL / A2A_PUBLIC_BASE_URL / NEXT_PUBLIC_*。
  CORS 预检经 CF 实测返回 `access-control-allow-origin: https://telos.indulgeback.org` ✓。
- **hermes**：6.7G 全量迁毕；在新机以 **systemd user units**（`hermes-gateway`/`hermes-dashboard`）常驻，
  Telegram polling 已连。⚠️ venv 基础解释器在 uv 目录（`~/.local/share/uv/python/cpython-3.11-*`），不在 .hermes 内，已补传。
- **宝塔**：不迁（用户拍板）。**frps**：新机 active（7100/7102），用户设备 frpc 需改 serverAddr。
- **雷池控制台密码**：DB 已置 admin/admin（md5+空盐 legacy 路径）；若登不进，在腾讯 OrcaTerm 跑
  `docker exec -it safeline-mgt /app/mgt-cli reset-admin --once`（交互式，SSH 管道喂不进）。
- **老机**：`.icu` 已到期；老机 compose manifest 曾被失败部署截断为 0 字节（**老机不能再跑 compose 变更**），
  只读观察期，数据冷备留在旧机。
