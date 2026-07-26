"""资源站数据结构"""
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.response import PaginationInfo


# ========== 辅助类（Support）==========


# ========== 请求类（Request）==========


class ResourceSiteCreateRequest(BaseModel):
    """资源站创建请求"""

    site_id: str = Field(..., min_length=1, max_length=100, description="资源站 ID")
    name: str = Field(..., min_length=1, max_length=100, description="资源站名称")
    base_url: str = Field(..., min_length=1, max_length=500, description="资源站 API 地址")
    enabled: bool = Field(True, description="是否启用")
    timeout: int = Field(15, ge=1, le=120, description="请求超时时间")
    search_endpoint: str = Field("wd", min_length=1, max_length=50, description="搜索关键词参数名")
    page_param: str = Field("pg", min_length=1, max_length=50, description="分页参数名")
    action_param: str = Field("ac", min_length=1, max_length=50, description="动作参数名")


class ResourceSiteUpdateRequest(BaseModel):
    """资源站更新请求"""

    name: str | None = Field(None, min_length=1, max_length=100, description="资源站名称")
    base_url: str | None = Field(None, min_length=1, max_length=500, description="资源站 API 地址")
    enabled: bool | None = Field(None, description="是否启用")
    timeout: int | None = Field(None, ge=1, le=120, description="请求超时时间")
    search_endpoint: str | None = Field(None, min_length=1, max_length=50, description="搜索关键词参数名")
    page_param: str | None = Field(None, min_length=1, max_length=50, description="分页参数名")
    action_param: str | None = Field(None, min_length=1, max_length=50, description="动作参数名")


class ResourceConfigImportRequest(BaseModel):
    """资源站配置导入请求"""

    sites: list["ResourceSiteResponse"] = Field(..., min_length=1, description="资源站列表")


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


class ResourceSiteBatchTestResponse(BaseModel):
    """资源站批量测试响应"""

    total: int = 0
    success_count: int = 0
    failed_count: int = 0
    results: list[ResourceSiteTestResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ResourceSiteDeleteResponse(BaseModel):
    """资源站删除响应"""

    site_id: str
    message: str

    model_config = ConfigDict(from_attributes=True)


class ResourceConfigExportResponse(BaseModel):
    """资源站配置导出响应"""

    sites: list[ResourceSiteResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ResourceConfigImportResponse(BaseModel):
    """资源站配置导入响应"""

    imported_count: int = 0
    message: str = ""

    model_config = ConfigDict(from_attributes=True)


ResourceConfigImportRequest.model_rebuild()
