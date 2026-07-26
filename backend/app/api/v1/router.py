"""API v1 路由聚合"""
from fastapi import APIRouter

from app.api.v1 import (
    favorites,
    health,
    history,
    logs,
    monitor,
    play_records,
    resources,
    videos,
)


router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(resources.router)
router.include_router(videos.router)
router.include_router(history.router)
router.include_router(favorites.router)
router.include_router(play_records.router)
router.include_router(logs.router)
router.include_router(monitor.router)
