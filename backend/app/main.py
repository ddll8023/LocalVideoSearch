"""FastAPI 应用入口"""
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.database import init_db
from app.schemas.response import ErrorCode, error
from app.utils import http_client


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """管理应用启动和关闭生命周期"""
    settings.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    settings.LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    setup_logging()
    init_db()
    http_client.get_shared_client()
    logger.info(f"{settings.APP_NAME} 后端启动: env={settings.APP_ENV}")
    yield
    await http_client.close_shared_client()
    logger.info(f"{settings.APP_NAME} 后端关闭")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """转换参数校验异常"""
    logger.warning(f"请求参数校验失败: path={request.url.path} error={exc}")
    return JSONResponse(
        status_code=422,
        content=error(code=ErrorCode.PARAM_ERROR, message="参数错误"),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """转换未预期异常"""
    logger.error(f"系统内部异常: path={request.url.path} error={exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=error(code=ErrorCode.INTERNAL_ERROR, message="系统内部错误"),
    )

