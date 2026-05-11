"""监控模块数据结构"""
from pydantic import BaseModel, ConfigDict, Field


# ========== 辅助类（Support）==========


class SitePerformanceItemResponse(BaseModel):
    """站点性能项"""

    site: str = ""
    request_count: int = 0
    success_count: int = 0
    error_count: int = 0
    success_rate: float = 0
    average_response_time: int = 0

    model_config = ConfigDict(from_attributes=True)


class TrendPointResponse(BaseModel):
    """趋势点"""

    label: str = ""
    search_count: int = 0
    error_count: int = 0
    average_response_time: int = 0

    model_config = ConfigDict(from_attributes=True)


class HotKeywordItemResponse(BaseModel):
    """热门关键词项"""

    keyword: str = ""
    count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ========== 请求类（Request）==========


# ========== 响应类（Response）==========


class DashboardOverviewResponse(BaseModel):
    """仪表板概览响应"""

    active_users: int = 0
    search_count: int = 0
    success_rate: float = 0
    average_response_time: int = 0
    error_count: int = 0
    request_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ActiveUsersResponse(BaseModel):
    """活跃用户响应"""

    minutes: int = 30
    active_users: int = 0
    request_count: int = 0
    operation_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SearchStatsResponse(BaseModel):
    """搜索统计响应"""

    hours: int = 24
    total_searches: int = 0
    success_count: int = 0
    failed_count: int = 0
    success_rate: float = 0
    average_response_time: int = 0

    model_config = ConfigDict(from_attributes=True)


class SystemHealthResponse(BaseModel):
    """系统健康响应"""

    hours: int = 24
    status: str = "healthy"
    error_count: int = 0
    warning_count: int = 0
    average_response_time: int = 0
    latest_log_time: str = ""

    model_config = ConfigDict(from_attributes=True)


class RealTimeSummaryResponse(BaseModel):
    """实时摘要响应"""

    running: bool = True
    generated_at: str = ""
    latest_log_time: str = ""
    recent_requests: int = 0
    recent_errors: int = 0

    model_config = ConfigDict(from_attributes=True)


class SitePerformanceResponse(BaseModel):
    """站点性能响应"""

    hours: int = 24
    lists: list[SitePerformanceItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class TrendsResponse(BaseModel):
    """趋势响应"""

    hours: int = 24
    lists: list[TrendPointResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class HotKeywordsResponse(BaseModel):
    """热门关键词响应"""

    hours: int = 24
    lists: list[HotKeywordItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
