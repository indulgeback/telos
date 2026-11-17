# 服务器迁移脚本集

配套文档：`docs/server-migration-plan.md`（先读它）。

## 执行顺序

```
02-init-new-server.sh    # 新机初始化（新机，root）
01-export-from-old.sh    # 旧机导出（试运行可在切换前 1 天做一次演练）
   ↓ 传输 migration-*.tar.gz + .sha256 到新机（scp/rsync，务必 sha256sum -c 校验）
03-restore-on-new.sh     # 新机恢复 + 按依赖启动（切换窗口内正式跑）
04-verify-all.sh         # 全绿 → DNS 切 A 记录 → 再跑一次 04 --public
05-rollback.sh           # 任一步失败：DNS 切回旧机（旧机保持运行 ≥7 天）
```

## 执行方式（重要）

01 脚本会短暂停 6 个 Telos 服务 + SafeLine 再导出。**必须脱离终端执行**，否则 ssh 断连
会杀掉脚本，服务停着没人拉起（脚本内已有 `trap EXIT` 兜底，但别依赖它当常规路径）：

```bash
# 旧机上（把脚本 scp 过去后）：
setsid nohup sudo bash /tmp/01-export-from-old.sh > /tmp/export.log 2>&1 < /dev/null &
tail -f /tmp/export.log    # 观察进度，完成标志：✅ 导出完成
```

另：compose 清单里有 `:?` 强制变量（如 `WORKSPACE_SHARE_BASE_URL`），服务器 `.env`
必须包含全部 8 个强制变量，否则任何 `docker compose` 命令都会在插值阶段失败。

## 需要人工准备

- 新机公网 IP / SSH 密钥
- DNSPod 上 `telos` A 记录的修改权限（或 API Token）
- 切换前 24h：把该记录 TTL 降到 60s
- 确认域名续费（2026-11-18 到期）
