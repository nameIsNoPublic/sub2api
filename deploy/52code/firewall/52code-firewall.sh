#!/bin/bash
# =============================================================================
# 52code 对外端口白名单：Docker 发布的 ${C52_PORT} 只允许边缘机访问
# =============================================================================
# Docker 发布的端口不经过 ufw 的 INPUT 链，必须在 DOCKER-USER 链里拦。
# 做法与同机 aihubx 的 AIHUBX136-WEB 一致，但使用独立链名 C52-WEB，互不影响。
# 幂等：重复执行不会产生重复规则；可作为 systemd oneshot 在开机时执行。
#
# 用法：
#   ./52code-firewall.sh                       # 从 ../.env 读取 EDGE_IP
#   C52_EDGE_IP=203.0.113.10 ./52code-firewall.sh
# 没有边缘机 IP 时链里只剩 REJECT，端口对外完全关闭；本机访问不受影响。
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${C52_ENV_FILE:-$SCRIPT_DIR/../.env}"

C52_PORT="${C52_PORT:-18080}"
C52_IFACE="${C52_IFACE:-enp9s0f1np1}"
C52_EDGE_IP="${C52_EDGE_IP:-}"
CHAIN="C52-WEB"

# 未显式给 IP 时，从 .env 里取 EDGE_IP / PUBLIC_PORT
if [ -f "$ENV_FILE" ]; then
  if [ -z "$C52_EDGE_IP" ]; then
    C52_EDGE_IP="$(sed -nE 's/^EDGE_IP=\s*([0-9.]*)\s*$/\1/p' "$ENV_FILE" | tail -1)"
  fi
  env_port="$(sed -nE 's/^PUBLIC_PORT=\s*([0-9]+)\s*$/\1/p' "$ENV_FILE" | tail -1)"
  if [ -n "$env_port" ] && [ -z "${C52_PORT_EXPLICIT:-}" ]; then
    C52_PORT="$env_port"
  fi
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "需要 root 权限执行" >&2
  exit 1
fi

# 独立链：先兜底 REJECT，再把边缘机插到最前面，重建过程中没有放空窗口
iptables -nL "$CHAIN" >/dev/null 2>&1 || iptables -N "$CHAIN"
iptables -F "$CHAIN"
iptables -A "$CHAIN" -j REJECT --reject-with icmp-port-unreachable
if [ -n "$C52_EDGE_IP" ]; then
  iptables -I "$CHAIN" 1 -s "$C52_EDGE_IP/32" -j RETURN
fi

# 外网进来、目标端口为 ${C52_PORT} 的新连接交给 C52-WEB 判定
hook=(-i "$C52_IFACE" -p tcp -m conntrack --ctdir ORIGINAL --ctorigdstport "$C52_PORT" -j "$CHAIN")
iptables -C DOCKER-USER "${hook[@]}" 2>/dev/null || iptables -I DOCKER-USER 1 "${hook[@]}"

echo "C52-WEB：接口 $C52_IFACE 端口 $C52_PORT 仅放行 ${C52_EDGE_IP:-<无，全部拒绝>}"
iptables -S "$CHAIN"
