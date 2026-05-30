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

| 层级 | 技术                                               |
| ---- | -------------------------------------------------- |
| 后端 | Go 1.23、Gin、GORM、MySQL 8.0、WebSocket           |
| 前端 | React 18、Vite、Ant Design、Tailwind CSS、Recharts |
| 部署 | Docker、Docker Compose、Nginx                      |

---

## 快速开始（一键部署）

### 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- （可选）Git

### 1. 克隆项目

```bash
git clone https://github.com/your-org/go-lighthouse.git
cd go-lighthouse
```

### 2. 一键启动

**Linux / macOS：**

```bash
./deploy.sh
```

**Windows（PowerShell）：**

```powershell
.\deploy.ps1
```

启动完成后访问：

- **Web 界面**：http://localhost
- **后端 API**：http://localhost:8080
- **健康检查**：http://localhost:8080/api/v1/base/health

### 3. 常用命令

```bash
# 查看实时日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并清除数据卷
docker-compose down -v

# 重启指定服务
docker-compose restart backend
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

后端通过环境变量读取配置，可在 `docker-compose.yml` 中修改：

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

## 目录结构

```
go-lighthouse/
├── go-lighthouse/          # 后端源码（Go）
│   ├── main.go
│   ├── config/             # 配置读取
│   ├── controller/         # HTTP 控制器
│   ├── core/               # 任务队列核心
│   ├── db/                 # 数据库初始化
│   ├── middleware/         # Gin 中间件
│   ├── model/              # GORM 模型
│   ├── router/             # 路由注册
│   ├── service/            # 业务逻辑
│   ├── websocket/          # WebSocket Hub
│   └── Dockerfile          # 后端镜像构建
├── lighthouse-web/         # 前端源码（React + Vite）
│   ├── src/
│   ├── Dockerfile          # 前端镜像构建
│   └── nginx.conf          # 前端 Nginx 配置
├── nginx/
│   └── nginx.conf          # 反向代理配置
├── docker-compose.yml      # 编排文件
├── deploy.sh               # Linux/macOS 一键部署
├── deploy.ps1              # Windows 一键部署
├── README.md               # 项目说明
└── DEPLOYMENT.md           # 详细部署文档
```

---

## License

MIT License © 2024 Go-Lighthouse Team
