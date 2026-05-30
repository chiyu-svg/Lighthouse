# Go-Lighthouse

[![Go](https://img.shields.io/badge/Go-1.23+-blue.svg)](https://golang.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> 基于 Go + React 的全栈任务调度与监控系统，支持 Hook 触发器、任务队列、实时监控和 WebSocket 日志推送。

---

## 项目介绍

Go-Lighthouse 是一个轻量级、高性能的任务调度平台，核心特性包括：

- **Hook 管理**：创建、编辑、启用/禁用 Webhook 接收端点
- **触发器配置**：为 Hook 绑定触发规则与执行动作
- **任务队列**：基于 Go Channel 的异步任务调度（8 Worker + 100 容量队列）
- **实时监控**：Goroutine 趋势、成功率趋势、任务耗时 Top5
- **WebSocket 推送**：实时接收任务执行日志与监控数据
- **优雅关闭**：支持 SIGINT / SIGTERM 信号，确保资源完整释放

---

## 技术栈

| 层级 | 技术                                                        |
| ---- | ----------------------------------------------------------- |
| 后端 | Go 1.23、Gin、GORM、MySQL 8.0、WebSocket                    |
| 前端 | Node.js、React 18、Vite、Ant Design、Tailwind CSS、Recharts |
| 部署 | Docker、Nginx                                               |

---

## 快速开始

### 环境要求

- Docker 20.10+

### 1. 克隆项目

```bash
git clone https://github.com/your-org/go-lighthouse.git
cd go-lighthouse
```

### 2. 生产环境部署（Docker）

#### 环境准备

##### 以下未声明“本地”操作，均为云服务器配置

**器安装 Docker（CentOS）**

```bash
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl status docker
```

**创建 Docker 网络**

```bash
docker network create go-lighthouse-net
```

#### 部署 MySQL

```bash
sudo docker run -d \
  --name go-lighthouse-mysql \
  --network go-lighthouse-net \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD="MyStrongPassword123!" \
  -e MYSQL_DATABASE=go_lighthouse \
  -e MYSQL_CHARSET=utf8mb4 \
  -e MYSQL_COLLATION=utf8mb4_unicode_ci \
  -v mysql_data:/var/lib/mysql \
  --restart unless-stopped \
  mysql:8.0
```

**本地后端编译（Linux AMD64）**

```bash
cd go-lighthouse

CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o go-lighthouse （构建后端执行文件）
```

#### 部署后端服务

```bash
sudo docker run -d \
  --name go-lighthouse-backend \
  --network go-lighthouse-net \
  -p 8080:8080 \
  -e SERVER_PORT=8080 \
  -e DB_HOST=go-lighthouse-mysql \
  -e DB_PORT=3306 \
  -e DB_USER=root \
  -e DB_PASSWORD="MyStrongPassword123" \
  -e DB_NAME=go_lighthouse \
  -e TZ=Asia/Shanghai \
  -v /app/go-lighthouse/go-lighthouse:/app/go-lighthouse \ （映射前端打包文件）
  --restart unless-stopped \
  go-lighthouse-backend:latest
```

> 注意：请确保 `DB_PASSWORD` 与 MySQL 容器设置的 `MYSQL_ROOT_PASSWORD` 保持一致。

#### 本地构建前端代码

```bash
cd lighthouse-web

npm install

npm build
```

#### 部署前端（Nginx）

```bash
sudo docker run -d \
  --name go-lighthouse-frontend \
  --network go-lighthouse-net \
  -p 80:80 \
  -p 443:443 \
  -v /app/go-lighthouse/dist:/usr/share/nginx/html:ro \ （映射前端构建文件）
  -v /app/go-lighthouse/nginx.conf:/etc/nginx/conf.d/default.conf:ro \ （映射naginx配置文件）
  -v /app/certs:/app:ro \
  go-lighthouse-nginx:latest
```

---

## 功能说明

| 模块             | 功能                                      |
| ---------------- | ----------------------------------------- |
| **Hook**         | 创建、编辑、删除、分页查询、状态切换      |
| **Trigger**      | 基于 Hook ID 创建触发规则与动作参数       |
| **Task**         | 任务分页列表、详情查看、Action 日志追踪   |
| **Monitor**      | 实时 Goroutine 数、成功率、任务耗时排行   |
| **WebSocket**    | `/ws/log` 实时推送任务执行日志            |
| **Webhook 接收** | `/api/v1/hook/receive/:id` 供外部平台调用 |

---

## 配置说明

后端通过环境变量读取配置

| 环境变量      | 默认值          | 说明           |
| ------------- | --------------- | -------------- |
| `SERVER_PORT` | `8080`          | 后端监听端口   |
| `DB_HOST`     | `mysql`         | MySQL 主机地址 |
| `DB_PORT`     | `3306`          | MySQL 端口     |
| `DB_USER`     | `root`          | MySQL 用户名   |
| `DB_PASSWORD` | `root`          | MySQL 密码     |
| `DB_NAME`     | `go_lighthouse` | 数据库名称     |

前端构建时通过 Vite 代理开发环境请求，生产环境由 Nginx 统一反向代理，无需额外配置。

---

## API 文档

### 基础接口

| 方法 | 路径                  | 说明     |
| ---- | --------------------- | -------- |
| GET  | `/api/v1/base/health` | 健康检查 |

### Hook 模块

| 方法 | 路径                      | 说明      |
| ---- | ------------------------- | --------- |
| POST | `/api/v1/hook/create`     | 创建 Hook |
| GET  | `/api/v1/hook/list`       | 分页查询  |
| GET  | `/api/v1/hook/detail/:id` | 查询详情  |
| POST | `/api/v1/hook/update/:id` | 更新 Hook |
| POST | `/api/v1/hook/delete/:id` | 删除 Hook |
| POST | `/api/v1/hook/toggle/:id` | 切换状态  |

### Trigger 模块

| 方法 | 路径                             | 说明             |
| ---- | -------------------------------- | ---------------- |
| POST | `/api/v1/trigger/create`         | 创建 Trigger     |
| POST | `/api/v1/trigger/update/:id`     | 更新 Trigger     |
| GET  | `/api/v1/trigger/detail/:hookId` | 根据 HookID 查询 |

### Task 模块

| 方法 | 路径                          | 说明        |
| ---- | ----------------------------- | ----------- |
| GET  | `/api/v1/task/list`           | 任务列表    |
| GET  | `/api/v1/task/detail/:id`     | 任务详情    |
| GET  | `/api/v1/task/action-log/:id` | Action 日志 |

### Monitor 模块

| 方法 | 路径                             | 说明           |
| ---- | -------------------------------- | -------------- |
| GET  | `/api/v1/monitor/data`           | 监控概览       |
| GET  | `/api/v1/monitor/goroutine`      | Goroutine 趋势 |
| GET  | `/api/v1/monitor/success-rate`   | 成功率趋势     |
| GET  | `/api/v1/monitor/task-cost-top5` | 耗时 Top5      |

### WebSocket

| 方法 | 路径                      | 说明         |
| ---- | ------------------------- | ------------ |
| GET  | `/ws/log?taskId=&hookId=` | 实时日志推送 |

---

## 联系作者

如果觉得这个项目对你有帮助，欢迎加微信交流，或者请作者喝一杯咖啡 ☕

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="./assets/wechat-card.png" width="200" alt="微信名片" />
        <br />
        <sub>微信扫码，交个朋友</sub>
      </td>
      <td align="center">
        <img src="./assets/buy-me-a-coffee.png" width="200" alt="收款码" />
        <br />
        <sub>请作者喝杯咖啡 ☕</sub>
      </td>
    </tr>
  </table>
</div>

---

## License

MIT License © 2024 Go-Lighthouse Team
