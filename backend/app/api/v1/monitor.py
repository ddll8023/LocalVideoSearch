"""监控 API"""
from fastapi import APIRouter, Query

from app.schemas import monitor as schemas_monitor
from app.schemas.response import ApiResponse, error, success
from app.services import monitor as services_monitor
from app.utils.exception import ServiceException


router = APIRouter(prefix="/monitor", tags=["monitor"])


@router.get(
    "/dashboard",
    response_model=ApiResponse[schemas_monitor.DashboardOverviewResponse],
)
def query_dashboard_overview():
    """查询仪表板概览"""
    try:
        result = services_monitor.get_dashboard_overview()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/search-stats",
    response_model=ApiResponse[schemas_monitor.SearchStatsResponse],
)
def query_search_stats(hours: int = Query(24, ge=1, le=168)):
    """查询搜索统计"""
    try:
        result = services_monitor.get_search_stats(hours)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/system-health",
    response_model=ApiResponse[schemas_monitor.SystemHealthResponse],
)
def query_system_health(hours: int = Query(24, ge=1, le=168)):
    """查询系统健康"""
    try:
        result = services_monitor.get_system_health_stats(hours)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/real-time",
    response_model=ApiResponse[schemas_monitor.RealTimeSummaryResponse],
)
def query_real_time_summary():
    """查询实时摘要"""
    try:
        result = services_monitor.get_real_time_data()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/site-performance",
    response_model=ApiResponse[schemas_monitor.SitePerformanceResponse],
)
def query_site_performance(hours: int = Query(24, ge=1, le=168)):
    """查询站点性能"""
    try:
        result = services_monitor.get_site_performance(hours)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/trends",
    response_model=ApiResponse[schemas_monitor.TrendsResponse],
)
def query_trends(hours: int = Query(24, ge=1, le=168)):
    """查询趋势数据"""
    try:
        result = services_monitor.get_trends(hours)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/hot-keywords",
    response_model=ApiResponse[schemas_monitor.HotKeywordsResponse],
)
def query_hot_keywords(
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(10, ge=1, le=50),
):
    """查询热门关键词"""
    try:
        result = services_monitor.get_hot_keywords(hours, limit)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
