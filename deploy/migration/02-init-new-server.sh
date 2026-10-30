#!/usr/bin/env bash
# 02-init-new-server.sh —— 新机初始化
# 用法：在新机上执行（需 root 或 sudo）。可重复执行（幂等）。
set -euo pipefail

log() { echo "[$(date '+%H:%M:%S')] $*"; }

[[ $EUID -eq 0 ]] || { echo "请用 root/sudo 执行" >&2; exit 1; }

# ---- 1) 时区 ----
timedatectl set-timezone Asia/Shanghai 2>/dev/null || true
log "时区: $(timedatectl show -p --value=format:%T 2>/dev/null || date)"

# ---- 2) swap 4G（4G 内存机防 OOM 的关键）----
if ! swapon --show=NAME | grep -q swapfile; then
  log "创建 4G swap..."
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
  grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
else
  log "swap 已存在"
fi

# ---- 3) Docker + compose plugin（官方 apt 源）----
if ! command -v docker >/dev/null; then
  log "安装 Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg >/dev/null
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
else
  log "Docker 已安装: $(docker --version)"
fi
systemctl enable --now docker

# ---- 4) 目录骨架 ----
log "创建目录骨架..."
mkdir -p /opt/telos/secrets /opt/telos/workspaces /data /opt/rustdesk/data

# ---- 5) SSH 加固（可选，按需放开）----
log "SSH 基线..."
# 只禁密码登录（先确认你已配置好密钥再手动开启下面两行！）：
# sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl reload ssh

# ---- 6) mihomo（由 03 从迁移包恢复后执行本段；独立可重跑）----
# unit 文件随迁移包带来（mihomo.service），03 脚本负责落位。此处只做说明。

log "✅ 新机初始化完成。下一步：传输迁移包并执行 03-restore-on-new.sh"
