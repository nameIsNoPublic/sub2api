# 52code 生产部署

与同机其他项目完全独立：自己的 nginx、应用、PostgreSQL、Redis，各自的网络和数据卷，对外只开一个端口给边缘机。

```
用户 ──HTTPS──▶ 边缘机 nginx（TLS、证书）──HTTP──▶ 本机 38.46.220.136:18080
                                                        │
                                                 52code-nginx
                                                        │
                                                  52code-app:8080 ──▶ 52code-postgres
                                                                   └▶ 52code-redis
```

## 目录

| 文件 | 作用 |
|---|---|
| `docker-compose.yml` | 4 个容器的编排；应用、库、缓存通过 `extends` 复用 `../docker-compose.yml`，跟随上游更新 |
| `.env.example` | 52code 关心的变量；其余变量名与 `../.env.example` 一致，需要时追加到 `.env` |
| `nginx/templates/default.conf.template` | 源站 nginx 配置，启动时按 `EDGE_IP`、`SERVER_NAMES` 渲染 |
| `firewall/52code-firewall.sh` | 把 Docker 发布的 18080 限制为只允许边缘机访问（独立链 `C52-WEB`） |
| `firewall/52code-firewall.service` | 开机重建上述规则的 systemd 单元 |
| `edge/52code.ai.conf.example` | 边缘机上的站点配置示例，买好边缘机后直接套用 |

## 首次部署

在服务器上以 root 执行。假设代码放在 `/opt/52code`。

```bash
git clone <仓库地址> /opt/52code
cd /opt/52code/deploy/52code
cp .env.example .env
# 编辑 .env：至少改 POSTGRES_PASSWORD、REDIS_PASSWORD；边缘机 IP 先留空
```

构建镜像并启动（首次构建要编前端和 Go，32 核机器约几分钟）：

```bash
docker compose build
docker compose up -d
docker compose ps
```

本机验证（不经过防火墙白名单）：

```bash
curl -s http://38.46.220.136:18080/nginx-health      # ok
curl -s -H 'Host: 52code.ai' http://38.46.220.136:18080/health
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: 52code.ai' http://38.46.220.136:18080/
```

装上防火墙白名单。没有边缘机 IP 时端口对外完全关闭，本机访问不受影响：

```bash
./firewall/52code-firewall.sh
cp firewall/52code-firewall.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now 52code-firewall.service
```

首次启动应用会自动初始化数据库，管理员账号按 `../.env.example` 里 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 的说明设置。

## 接入边缘机

1. 边缘机上装 nginx 和 certbot，把 `edge/52code.ai.conf.example` 放到 `/etc/nginx/conf.d/52code.ai.conf`，按文件头注释签证书。
2. 本机 `.env` 填 `EDGE_IP=<边缘机公网 IP>`，然后：

   ```bash
   docker compose up -d nginx          # 重新渲染 nginx 配置
   ./firewall/52code-firewall.sh       # 白名单放行边缘机
   ```

3. DNS：`52code.ai` 和 `www.52code.ai` 的 A 记录指向边缘机。

边缘机到源站是明文 HTTP，客户端真实 IP 靠 `X-Forwarded-For` 传递，源站 nginx 只信任 `EDGE_IP` 发来的这个头，再以 `X-Real-IP` / `X-Forwarded-For` 单值交给应用。

## 更新代码

上游 sub2api 更新后，在本地合并到本仓库、推送，然后在服务器上：

```bash
cd /opt/52code && git pull
cd deploy/52code
# 换一个镜像标签，旧镜像留着方便回滚
sed -i 's/^C52_IMAGE_TAG=.*/C52_IMAGE_TAG=20261112/' .env
docker compose build
docker compose up -d
docker compose logs -f --tail=100 sub2api
```

回滚：把 `C52_IMAGE_TAG` 改回上一个标签，`docker compose up -d` 即可。数据库迁移由应用启动时自动执行，回滚前先确认目标版本能接受当前库结构。

## 日常

```bash
docker compose ps                        # 状态
docker compose logs -f sub2api           # 应用日志
docker compose logs -f nginx             # 访问日志
docker compose exec postgres psql -U sub2api -d sub2api
docker compose exec sub2api sh           # 进入应用容器
```

数据都在命名卷里：`52code_sub2api_data`（应用数据和自动生成的 config.yaml）、`52code_postgres_data`、`52code_redis_data`。备份数据库：

```bash
docker compose exec -T postgres pg_dump -U sub2api -Fc sub2api > /opt/52code-backups/52code-$(date +%F).dump
```

## 与同机其他项目的边界

- 容器名、卷名、网络名都带 `52code` 前缀，不会和其他 compose 项目重名。
- 宿主机只占 `38.46.220.136:18080`；80/443 仍归现有项目。
- 防火墙用独立链 `C52-WEB`，只挂在 `DOCKER-USER` 上处理 18080，不碰现有链。
- 本目录是 52code 专属，上游 sub2api 的 `deploy/` 文件可以直接合并，不会和这里冲突。
