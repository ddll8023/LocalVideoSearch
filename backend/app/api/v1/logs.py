"""日志 API"""
from fastapi import APIRouter, Response

from app.schemas import logs as schemas_logs
from app.schemas.response import ApiResponse, PaginatedResponse, error, success
from app.services import logs as services_logs
from app.utils.exception import ServiceException


router = APIRouter(prefix="/logs", tags=["logs"])


@router.post(
    "/system/list",
    response_model=ApiResponse[PaginatedResponse[schemas_logs.LogItemResponse]],
)
def query_system_logs(query: schemas_logs.LogListRequest):
    """查询系统日志"""
    try:
        result = services_logs.query_log_list(query)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/stats",
    response_model=ApiResponse[schemas_logs.LogStatsResponse],
)
def query_log_stats(_request: schemas_logs.LogStatsRequest):
    """查询日志统计"""
    try:
        result = services_logs.get_log_stats()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post("/export")
def export_system_logs(query: schemas_logs.LogExportRequest):
    """导出系统日志"""
    try:
        filename, content, media_type = services_logs.export_logs(query)
        # 文件下载端点：直接返回附件响应，不包 ApiResponse 壳
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/clear",
    response_model=ApiResponse[schemas_logs.ClearLogsResponse],
)
def clear_system_logs(request: schemas_logs.ClearLogsRequest):
    """清理系统日志"""
    try:
        result = services_logs.clear_logs(request)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
