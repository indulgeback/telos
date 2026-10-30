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

## 需要人工准备

- 新机公网 IP / SSH 密钥
- DNSPod 上 `telos` A 记录的修改权限（或 API Token）
- 切换前 24h：把该记录 TTL 降到 60s
- 确认域名续费（2026-11-18 到期）
