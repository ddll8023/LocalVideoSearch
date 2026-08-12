# VideoSearch v0.1.0

VideoSearch 是一款本机运行的视频聚合搜索桌面应用。它通过 Electron 启动本地 FastAPI 服务，由 Vue 界面并发检索多个已启用资源站，统一展示视频详情和播放线路，并在本机保存搜索历史、收藏、观看进度、日志与监控数据。

> 当前桌面打包目标为 **Windows**；macOS 提供开发启动脚本，尚未配置对应安装包。

## 核心能力

- **多源搜索**：按启用站点并发搜索，逐站展示搜索中、成功或失败状态，失败站点可单独重试。
- **视频详情**：统一整理海报、简介、演职员、年份、评分、状态和按线路分组的剧集。
- **视频播放**：基于 Artplayer 与 HLS.js 播放 HLS 或普通媒体地址，支持线路/剧集切换、倍速、画中画、全屏和自动连播。
- **个人数据**：在本地保存搜索历史、收藏和观看位置，并在首页提供继续观看入口。
- **资源站管理**：支持站点增删改、启停、单站/批量连接测试，以及配置导入导出。
- **日志与监控**：支持日志筛选、分页、详情、JSON/CSV 导出和清理，并聚合请求趋势、站点性能、热门关键词和健康状态。
- **桌面编排**：Electron 自动启动后端、等待健康检查、处理启动失败重试，并提供无边框窗口控制。

## 系统结构

```mermaid
flowchart LR
    User[用户] --> Desktop[Electron 桌面壳]
    Desktop --> UI[Vue 前端]
    Desktop --> Backend[FastAPI 本地后端]
    UI --> Backend
    Backend --> Sites[第三方资源站]
    Backend --> Data[(SQLite)]
    Backend --> Files[配置与日志]
    Sites --> Media[外部媒体地址]
    UI --> Media
```

- Electron 负责桌面窗口和本地后端进程生命周期。
- Vue 前端负责页面交互、并发搜索状态、播放器和数据可视化。
- FastAPI 后端负责资源站配置、外部请求、数据适配、个人数据和日志统计。
- SQLite 与本地文件保存单机用户数据，不依赖远程账号服务。

## 技术栈

版本约束来自当前依赖清单；实际锁定版本见对应 lock 文件或[模块说明文档](./doc/模块说明文档.md)。

| 范围 | 技术 |
|---|---|
| 桌面端 | Electron `^43.2.0`、electron-builder `^26.15.3` |
| 前端 | Vue `^3.5.13`、Pinia `^3.0.1`、Vue Router `^4.5.0`、Axios `^1.7.9` |
| 播放与图表 | Artplayer `^5.4.0`、HLS.js `^1.5.20`、ECharts `^5.5.1` |
| 样式与构建 | Tailwind CSS `^3.4.17`、Vite `^6.0.7`、FontAwesome 6 |
| 后端 | Python `>=3.11`、FastAPI `>=0.115.0`、Uvicorn `>=0.30.0` |
| 数据与外部请求 | SQLAlchemy `>=2.0.51`、SQLite、HTTPX `>=0.27.0` |
| 环境与打包 | uv、Pydantic Settings、PyInstaller、NSIS |

## 项目结构

```text
LocalVideoSearch/
├── backend/                 # FastAPI 后端、SQLite 数据层和 PyInstaller 入口
│   ├── app/
│   ├── entry.py
│   ├── pyproject.toml
│   └── uv.lock
├── electron/                # Electron 主进程与 preload 安全桥接
├── frontend/                # Vue 3 前端及 Vite/Tailwind 配置
├── resources/               # 首次运行使用的默认资源站配置
├── doc/                     # 项目结构导航和业务模块说明
├── 规范文档/                # 前后端开发规范入口
├── package.json             # Electron 启动与 Windows 打包配置
└── README.md
```

完整目录职责和逐文件说明见[项目结构导航文档](./doc/项目结构文档.md)。

## 环境要求

请先安装：

- Node.js 与 npm（项目未固定具体版本）
- Python 3.11 或更高版本
- [uv](https://docs.astral.sh/uv/)

开发态后端虚拟环境必须位于 `backend/.venv/`。Electron 会按平台查找：

- Windows：`backend/.venv/Scripts/python.exe`
- macOS / Linux：`backend/.venv/bin/python`

## 安装依赖

在项目根目录执行：

```bash
npm install
npm --prefix frontend install
uv sync --directory backend
```

三条命令分别安装 Electron、前端和 Python 后端依赖。

## 开发运行

### 一键启动

依赖安装完成后：

**macOS**

```bash
./start-dev.command
```

> `start-dev.command` 会先尝试结束占用 `4739`、`4740` 端口的进程，再启动 Vite 和 Electron。执行前请确认这些端口上没有其他需要保留的服务。

**Windows**

```bat
start-dev.bat
```

两个脚本都会先启动前端开发服务，再启动 Electron；Electron 会自动启动本地 FastAPI 后端。

### 手动启动

使用两个终端，在项目根目录分别执行：

```bash
# 终端 1：前端开发服务
npm --prefix frontend run dev
```

```bash
# 终端 2：Electron；会自动启动后端
npm run electron
```

### 单独调试后端

```bash
uv run --directory backend uvicorn app.main:app \
  --host 127.0.0.1 \
  --port 4740 \
  --reload
```

Windows 也可以运行 `start-backend.bat`。单独打开前端而不启动 Electron 时，需要同时运行此后端服务。

## 端口与运行配置

| 服务 | 默认地址 | 说明 |
|---|---|---|
| Vite 开发服务 | `http://127.0.0.1:4739` | 仅开发态使用 |
| FastAPI 本地服务 | `http://127.0.0.1:4740` | Electron 启动后端并等待健康检查通过 |

后端支持通过环境变量或 `backend/.env` 覆盖配置；Electron 桌面模式会明确传入固定主机、端口和应用数据目录。

| 配置项 | 默认值 | 适用范围 |
|---|---|---|
| `API_HOST` | `127.0.0.1` | 后端监听地址；桌面模式固定为本机回环地址 |
| `API_PORT` | `4740` | 后端端口；桌面模式固定使用该端口 |
| `APP_DATA_DIR` | 按平台推导 | 配置、数据库和日志的可写目录 |
| `VITE_API_BASE_URL` | `http://127.0.0.1:4740` | 不通过 Electron 运行前端时的后端地址 |

普通接口使用统一响应结构：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

`code === 0` 表示业务成功；日志文件下载直接返回二进制响应，不使用该响应壳。

## 应用数据

桌面模式将运行数据写入 Electron 提供的用户应用数据目录：

| 系统 | 典型目录 |
|---|---|
| Windows | `%APPDATA%\VideoSearch\` |
| macOS | `~/Library/Application Support/VideoSearch/` |
| Linux | Electron 的应用数据目录下 `VideoSearch/` |

单独运行后端且未设置 `APP_DATA_DIR` 时，Linux 默认使用 `~/.local/share/VideoSearch/`。

```text
VideoSearch/
├── resource_sites.json      # 用户可写的资源站配置
├── video_search.db          # 搜索历史、收藏和播放记录
└── logs/
    ├── video_search.log     # 当前 JSON Lines 日志
    └── video_search.log.*   # 轮转备份（存在时）
```

默认站点来自项目内的 `resources/resource_sites.json`。首次需要配置时会复制到用户数据目录，之后的增删改、启停和导入操作只修改用户副本。

## 可用脚本

### 根目录

| 命令 | 作用 |
|---|---|
| `npm run electron` | 启动 Electron，并自动编排本地后端 |
| `npm run build:frontend` | 构建前端生产文件 |
| `npm run build:backend` | 使用 PyInstaller 构建 Windows 后端可执行文件 |
| `npm run dist:dir` | 构建 Windows 免安装目录版 |
| `npm run dist:win` | 构建 Windows NSIS 安装包 |

### 前端

| 命令 | 作用 |
|---|---|
| `npm --prefix frontend run dev` | 启动 Vite 开发服务 |
| `npm --prefix frontend run build` | 构建前端生产文件 |
| `npm --prefix frontend run preview` | 预览前端构建结果 |
| `npm --prefix frontend run lint` | 检查前端 JavaScript 与 Vue 文件 |

## Windows 打包

当前打包配置只声明 Windows 目录版和 NSIS 安装包。以下命令应在 Windows 环境执行，因为 PyInstaller 生成当前平台的后端程序，打包配置要求 `backend.exe`。

### 免安装目录版

```bash
npm run dist:dir
```

构建顺序：

1. Vite 生成前端生产文件。
2. PyInstaller 生成 `backend/dist/backend.exe`。
3. electron-builder 将桌面代码、前端产物、后端程序和默认资源组装到 `release/win-unpacked/`。

启动文件：

```text
release/win-unpacked/VideoSearch.exe
```

必须分发完整的 `win-unpacked` 目录，不能只复制 `VideoSearch.exe`。

### NSIS 安装包

```bash
npm run dist:win
```

产物写入 `release/`，安装时允许选择目录，并创建桌面与开始菜单快捷方式。

### 打包资源映射

| 源路径 | 打包后位置 |
|---|---|
| `backend/dist/backend.exe` | `resources/backend/backend.exe` |
| `frontend/dist/` | `resources/frontend/dist/` |
| `resources/` | `resources/resources/` |

打包后运行不依赖用户本机的 Python 虚拟环境。

## 数据与外部依赖说明

- 搜索关键词会发送到用户启用的第三方资源站；视频播放会直接访问第三方媒体地址。
- 搜索历史、收藏、观看记录、配置和日志保存在本机，不提供账号、云同步或多用户隔离。
- 日志可能包含搜索关键词、资源站地址、耗时和错误信息，但当前不会自动上传到远程服务。
- 收藏和观看记录只保存关键词，不保存原搜索页码；来自后续结果页的视频在回访时可能无法重新定位。
- 第三方接口结构、服务可用性和媒体地址均不受本项目控制；单站失败不会阻断其他站点。
- 当前播放器不提供 DRM、字幕管理或离线下载能力。

## 常见问题

### 开发态提示找不到后端 Python

确认已执行：

```bash
uv sync --directory backend
```

并检查平台对应的虚拟环境解释器是否存在：

```text
backend/.venv/Scripts/python.exe   # Windows
backend/.venv/bin/python           # macOS / Linux
```

### 打包时提示 `Backend executable not found`

先构建后端：

```bash
npm run build:backend
```

确认 `backend/dist/backend.exe` 存在后再运行 Electron 打包命令。

### Electron 打开后无法加载开发页面

确认 Vite 已在 `127.0.0.1:4739` 运行，再执行 `npm run electron`。

### 后端健康检查超时或端口占用

桌面模式固定使用 `127.0.0.1:4740`。停止占用该端口的进程后重试；macOS 一键脚本会主动尝试清理该端口。

### 打包后页面空白或静态资源加载失败

前端构建必须使用相对资源基址。检查 Vite 配置中的 `base` 是否仍为 `./`，并确认 `frontend/dist/` 已完整打入应用资源目录。

### 某个资源站搜索或测试失败

先在设置页单独测试该站点。超时、异常状态、无法解析的数据或反爬页面只会标记该站点失败，不影响其他站点。

## 相关文档

- [项目结构导航文档](./doc/项目结构文档.md)：绝对路径、目录职责、逐文件功能和问题定位入口。
- [模块说明文档](./doc/模块说明文档.md)：业务功能、模块边界、依赖关系和典型闭环。
- [后端规范文档](./规范文档/后端规范文档.md)：Python/FastAPI 开发规范入口。
- [前端规范文档](./规范文档/前端规范文档.md)：Vue JavaScript 开发规范入口。
