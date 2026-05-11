@echo off
chcp 65001 >nul
title VideoSearch Backend (Standalone)
echo [Backend] Starting FastAPI on http://127.0.0.1:4740 ...
echo [Backend] Note: Electron dev mode auto-starts backend. This script is for standalone debugging.
uv run --directory "%~dp0backend" uvicorn app.main:app --host 127.0.0.1 --port 4740 --reload
pause
