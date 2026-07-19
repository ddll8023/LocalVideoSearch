#!/bin/bash
# VideoSearch Dev Launcher (macOS)
# 双击此文件即可启动开发环境

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# 退出时清理所有后台子进程（用 & 启动的 Vite 等）
cleanup() {
    echo ""
    echo "正在停止所有服务..."
    kill $(jobs -p) 2>/dev/null
    wait 2>/dev/null
    echo "所有服务已停止。"
}
trap cleanup EXIT

# 检测端口占用并释放
release_port() {
    local port=$1
    local pid
    pid=$(lsof -ti :"$port" 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "端口 $port 已被进程 PID=$pid 占用，正在释放..."
        kill "$pid" 2>/dev/null
        sleep 1
        if lsof -ti :"$port" >/dev/null 2>&1; then
            echo "端口 $port 未能正常释放，强制终止..."
            kill -9 "$pid" 2>/dev/null
            sleep 1
        fi
        echo "端口 $port 已释放。"
    fi
}

echo "========================================"
echo "  VideoSearch Dev Launcher (macOS)"
echo "========================================"
echo ""

echo "[检查端口占用] 4739 / 4740 ..."
release_port 4739
release_port 4740
echo ""

echo "[1/2] Starting Vite dev server on http://127.0.0.1:4739 ..."
(cd frontend && npm run dev) &

sleep 3

echo "[2/2] Starting Electron (auto-starts backend on 127.0.0.1:4740) ..."
cd "$PROJECT_DIR"
npm run electron

echo ""
echo "Electron exited."
