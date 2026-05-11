@echo off
chcp 65001 >nul
title VideoSearch Frontend (Vite Dev)
echo [Frontend] Starting Vite dev server on http://127.0.0.1:4739 ...
cd /d "%~dp0frontend" && npm run dev
pause
