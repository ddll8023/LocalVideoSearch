"""资源站数据结构"""
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.response import PaginationInfo


# ========== 辅助类（Support）==========


# ========== 请求类（Request）==========


# ========== 响应类（Response）==========


class ResourceSiteResponse(BaseModel):
    """资源站响应"""

    site_id: str = Field(..., description="资源站 ID")
    name: str = Field(..., description="资源站名称")
    base_url: str = Field(..., description="资源站 API 地址")
    enabled: bool = Field(True, description="是否启用")
    timeout: int = Field(15, description="请求超时时间")
    search_endpoint: str = Field("wd", description="搜索关键词参数名")
    page_param: str = Field("pg", description="分页参数名")
    action_param: str = Field("ac", description="动作参数名")

    model_config = ConfigDict(from_attributes=True)


class ResourceStatsResponse(BaseModel):
    """资源站统计响应"""

    total_sites: int = 0
    enabled_sites: int = 0
    disabled_sites: int = 0

    model_config = ConfigDict(from_attributes=True)


class ResourceSiteListResponse(BaseModel):
    """资源站列表响应"""

    lists: list[ResourceSiteResponse] = Field(default_factory=list)
    pagination: PaginationInfo = Field(default_factory=PaginationInfo)
    stats: ResourceStatsResponse = Field(default_factory=ResourceStatsResponse)

    model_config = ConfigDict(from_attributes=True)


class ResourceSiteToggleResponse(BaseModel):
    """资源站启停切换响应"""

    site_id: str
    enabled: bool
    message: str

    model_config = ConfigDict(from_attributes=True)


class ResourceSiteTestResponse(BaseModel):
    """资源站连接测试响应"""

    site_id: str
    site_name: str
    success: bool
    message: str
    test_keyword: str
    status_code: int | None = None
    elapsed_ms: int = 0
    response_size: int = 0
    error: str | None = None

    model_config = ConfigDict(from_attributes=True)
