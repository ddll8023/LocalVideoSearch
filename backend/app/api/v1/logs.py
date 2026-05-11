"""日志 API"""
from fastapi import APIRouter, Depends

from app.schemas import logs as schemas_logs
from app.schemas.response import ApiResponse, PaginatedResponse, error, success
from app.services import logs as services_logs
from app.utils.exception import ServiceException


router = APIRouter(prefix="/logs", tags=["logs"])


@router.get(
    "/system",
    response_model=ApiResponse[PaginatedResponse[schemas_logs.LogItemResponse]],
)
def query_system_logs(query: schemas_logs.LogListRequest = Depends()):
    """查询系统日志"""
    try:
        result = services_logs.query_log_list(query)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/stats",
    response_model=ApiResponse[schemas_logs.LogStatsResponse],
)
def query_log_stats():
    """查询日志统计"""
    try:
        result = services_logs.get_log_stats()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/clear",
    response_model=ApiResponse[schemas_logs.ClearLogsResponse],
)
def clear_system_logs(request: schemas_logs.ClearLogsRequest | None = None):
    """清理系统日志"""
    try:
        result = services_logs.clear_logs(request or schemas_logs.ClearLogsRequest())
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
