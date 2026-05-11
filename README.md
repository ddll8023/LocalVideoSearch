# VideoSearch

VideoSearch 是一个本机运行的桌面端视频搜索工具，使用 `Vue 3 + Electron + FastAPI` 构建。

项目通过 Electron 创建桌面窗口，由主进程启动本地 FastAPI 子进程，前端渲染进程通过 Axios 调用本机后端接口完成资源站搜索、视频详情、播放源解析、日志查看和系统监控等功能。

## 技术栈

| 模块        | 技术                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| 桌面端      | Electron                                                                    |
| 前端        | Vue 3、Pinia、Vue Router、Axios、Tailwind CSS、FontAwesome、HLS.js、ECharts |
| 后端        | FastAPI、Pydantic Settings、HTTPX、Uvicorn                                  |
| Python 环境 | uv、`backend/.venv/`                                                      |
| 打包        | electron-builder、免安装目录版、NSIS                                        |

## 功能模块

- 视频搜索：按启用资源站并发搜索，按站点展示结果。
- 视频详情：定位资源站视频详情并解析播放源。
- 视频播放：支持 `m3u8` 和普通视频 URL 播放。
- 资源站管理：支持启用、禁用、连接测试和批量测试。
- 系统日志：支持日志查询、过滤、分页、详情查看和清理。
- 系统监控：基于日志聚合运行状态、搜索统计、站点性能和热门关键词。

## 目录结构

```text
VideoSearch/
├── backend/                 # FastAPI 后端
│   ├── app/
│   ├── pyproject.toml
│   └── .venv/               # uv 管理的 Python 虚拟环境
├── electron/                # Electron 主进程和 preload
│   ├── main/
│   └── preload/
├── frontend/                # Vue 3 前端
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── resources/               # 默认资源站配置
│   └── resource_sites.json
├── doc/                     # 设计文档
├── 规范文档/                # 前后端编码规范
├── package.json             # Electron 启动和打包配置
└── README.md
```

## 端口约定

| 服务               | 地址                      |
| ------------------ | ------------------------- |
| 前端 Vite 开发服务 | `http://127.0.0.1:4739` |
| FastAPI 后端服务   | `http://127.0.0.1:4740` |

Electron 主进程会在启动时使用固定后端端口 `4740` 启动 FastAPI，并通过 preload 向前端暴露后端地址。

## 环境准备

需要本机已安装：

- Node.js
- npm
- Python 3.11+
- uv

安装根目录依赖：

```powershell
cd D:\demo\electron\VideoSearch
npm install
```

安装前端依赖：

```powershell
cd D:\demo\electron\VideoSearch\frontend
npm install
```

准备后端虚拟环境：

```powershell
cd D:\demo\electron\VideoSearch
uv sync --directory backend
```

后端虚拟环境必须位于：

```text
backend/.venv/
```

Electron 主进程会固定查找：

```text
backend/.venv/Scripts/python.exe
```

## 开发运行

启动前端开发服务：

```powershell
cd D:\demo\electron\VideoSearch\frontend
npm run dev
```

启动 Electron：

```powershell
cd D:\demo\electron\VideoSearch
npm run electron
```

开发模式下，Electron 默认加载：

```text
http://127.0.0.1:4739
```

并自动启动本地 FastAPI：

```text
http://127.0.0.1:4740
```

## Windows 免安装目录版

打包前确认以下内容存在：

```text
backend/.venv/Scripts/python.exe
resources/resource_sites.json
```

执行打包：

```powershell
cd D:\demo\electron\VideoSearch
npm run dist:dir
```

打包脚本会先执行前端构建：

```text
npm --prefix frontend run build
```

然后通过 `electron-builder --win dir` 生成免安装目录版。

构建产物输出目录：

```text
release/win-unpacked/
```

直接打开以下文件即可启动软件：

```text
release/win-unpacked/VideoSearch.exe
```

需要桌面入口时，对 `VideoSearch.exe` 创建快捷方式即可。

注意：不能只复制单独的 `VideoSearch.exe`。必须保留整个 `win-unpacked` 目录，因为后端、前端构建产物和资源文件都在同级资源目录中。

如需生成安装包，可执行：

```powershell
cd D:\demo\electron\VideoSearch
npm run dist:win
```

## 打包资源说明

当前 `electron-builder` 配置会将以下目录复制到安装包资源目录：

| 源路径            | 打包后路径                              |
| ----------------- | --------------------------------------- |
| `backend`       | `process.resourcesPath/backend`       |
| `frontend/dist` | `process.resourcesPath/frontend/dist` |
| `resources`     | `process.resourcesPath/resources`     |

打包后 Electron 会从以下位置加载前端页面：

```text
process.resourcesPath/frontend/dist/index.html
```

并从以下位置启动后端：

```text
process.resourcesPath/backend/.venv/Scripts/python.exe
```

## 应用数据目录

桌面端运行数据写入 Windows 用户应用数据目录：

```text
%APPDATA%/VideoSearch/
├── resource_sites.json
└── logs/
    └── video_search.log
```

默认资源站配置来自项目内：

```text
resources/resource_sites.json
```

运行时会复制到应用数据目录，后续启用、禁用等配置修改会写入应用数据目录中的可写配置文件。

## 常见问题

### 后端启动失败：Python executable not found

说明 `backend/.venv/Scripts/python.exe` 不存在。需要在项目根目录执行：

```powershell
uv sync --directory backend
```

### 打包后页面空白或静态资源加载失败

确认 `frontend/vite.config.js` 中包含：

```javascript
base: './'
```

该配置用于适配 Electron 打包后通过 `loadFile()` 加载本地页面。

### 端口占用

当前后端固定使用：

```text
127.0.0.1:4740
```

如果该端口被其他进程占用，FastAPI 子进程会启动失败，需要先释放端口后再启动应用。

## 相关文档

- `doc/开发设计文档.md`
- `规范文档/后端规范文档.md`
- `规范文档/前端规范文档.md`
