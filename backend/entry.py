"""PyInstaller 入口脚本 — 打包后由 Electron 直接 spawn 此 exe"""
import os

import uvicorn

from app.main import app

host = os.environ.get("API_HOST", "127.0.0.1")
port = int(os.environ.get("API_PORT", "4740"))

uvicorn.run(app, host=host, port=port)
