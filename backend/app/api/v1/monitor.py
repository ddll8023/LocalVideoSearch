"""监控 API"""
from fastapi import APIRouter

from app.schemas import monitor as schemas_monitor
from app.schemas.response import ApiResponse, error, success
from app.services import monitor as services_monitor
from app.utils.exception import ServiceException


router = APIRouter(prefix="/monitor", tags=["monitor"])


@router.post(
    "/dashboard",
    response_model=ApiResponse[schemas_monitor.DashboardOverviewResponse],
)
def query_dashboard_overview(_request: schemas_monitor.DashboardRequest):
    """查询仪表板概览"""
    try:
        result = services_monitor.get_dashboard_overview()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/search-stats",
    response_model=ApiResponse[schemas_monitor.SearchStatsResponse],
)
def query_search_stats(request: schemas_monitor.MonitorWindowRequest):
    """查询搜索统计"""
    try:
        result = services_monitor.get_search_stats(request.hours)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/system-health",
    response_model=ApiResponse[schemas_monitor.SystemHealthResponse],
)
def query_system_health(request: schemas_monitor.MonitorWindowRequest):
    """查询系统健康"""
    try:
        result = services_monitor.get_system_health_stats(request.hours)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/real-time",
    response_model=ApiResponse[schemas_monitor.RealTimeSummaryResponse],
)
def query_real_time_summary(_request: schemas_monitor.RealTimeRequest):
    """查询实时摘要"""
    try:
        result = services_monitor.get_real_time_data()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/site-performance",
    response_model=ApiResponse[schemas_monitor.SitePerformanceResponse],
)
def query_site_performance(request: schemas_monitor.MonitorWindowRequest):
    """查询站点性能"""
    try:
        result = services_monitor.get_site_performance(request.hours)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/trends",
    response_model=ApiResponse[schemas_monitor.TrendsResponse],
)
def query_trends(request: schemas_monitor.MonitorWindowRequest):
    """查询趋势数据"""
    try:
        result = services_monitor.get_trends(request.hours)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/hot-keywords",
    response_model=ApiResponse[schemas_monitor.HotKeywordsResponse],
)
def query_hot_keywords(request: schemas_monitor.HotKeywordsRequest):
    """查询热门关键词"""
    try:
        result = services_monitor.get_hot_keywords(request.hours, request.limit)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
