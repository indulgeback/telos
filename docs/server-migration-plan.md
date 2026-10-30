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

__zcode_status=$?
if [ "$__zcode_status" -eq 0 ]; then pwd -P > '/var/folders/s8/8vpdgc094s7dp9z0vj4l2n640000gn/T/zcode-03e12525-9784-43bf-a08e-b01b4bfcb4a4-cwd'; fi
exit "$__zcode_status"