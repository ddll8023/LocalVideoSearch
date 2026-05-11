@echo off
chcp 65001 >nul
title VideoSearch Dev

echo ========================================
echo   VideoSearch Electron Dev Launcher
echo ========================================
echo.

echo [1/2] Starting Vite dev server ...
start "VideoSearch Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Electron ...
cd /d "%~dp0"
npx electron .

echo.
echo Electron exited.
pause
