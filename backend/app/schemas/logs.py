"""日志模块数据结构"""
from pydantic import BaseModel, ConfigDict, Field


# ========== 辅助类（Support）==========


# ========== 请求类（Request）==========


class LogListRequest(BaseModel):
    """日志列表查询请求"""

    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")
    log_type: str | None = Field(None, description="日志类型")
    level: str | None = Field(None, description="日志级别")
    start_time: str | None = Field(None, description="开始时间")
    end_time: str | None = Field(None, description="结束时间")
    keyword: str | None = Field(None, description="关键词")


class ClearLogsRequest(BaseModel):
    """清理日志请求"""

    include_backups: bool = Field(True, description="是否清理轮转日志")


# ========== 响应类（Response）==========


class LogItemResponse(BaseModel):
    """日志列表项"""

    id: str = ""
    timestamp: int = 0
    time: str = ""
    level: str = ""
    log_type: str = ""
    logger_name: str = ""
    message: str = ""
    request_id: str | None = None
    site: str | None = None
    url: str | None = None
    status: int | None = None
    elapsed_ms: int | None = None
    data_count: int | None = None
    error: str | None = None
    component: str | None = None
    operation_type: str | None = None
    description: str | None = None
    client_ip: str | None = None
    user_agent: str | None = None
    exception: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LogStatsResponse(BaseModel):
    """日志统计响应"""

    total: int = 0
    info_count: int = 0
    warning_count: int = 0
    error_count: int = 0
    system_count: int = 0
    request_count: int = 0
    operation_count: int = 0
    recent_error_count: int = 0
    latest_time: str = ""
    levels: dict[str, int] = Field(default_factory=dict)
    types: dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class ClearLogsResponse(BaseModel):
    """清理日志响应"""

    cleared_count: int = 0
    message: str = ""

    model_config = ConfigDict(from_attributes=True)
