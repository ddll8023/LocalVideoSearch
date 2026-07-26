"""视频数据结构"""
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.response import PaginationInfo


# ========== 辅助类（Support）==========


class PlayEpisodeResponse(BaseModel):
    """单集播放项响应"""

    name: str = ""
    url: str = ""

    model_config = ConfigDict(from_attributes=True)


class PlayLineResponse(BaseModel):
    """播放线路响应"""

    name: str = ""
    format: str = "mp4"
    episodes: list[PlayEpisodeResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class FilterStatsResponse(BaseModel):
    """视频过滤统计响应"""

    original_count: int = 0
    filtered_count: int = 0
    display_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ========== 请求类（Request）==========


class VideoSearchRequest(BaseModel):
    """视频搜索请求"""

    wd: str = Field(..., min_length=1, max_length=100, description="搜索关键词")
    site_id: str = Field(..., min_length=1, max_length=100, description="资源站 ID")
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")


class VideoDetailRequest(BaseModel):
    """视频详情请求"""

    keyword: str = Field(..., min_length=1, max_length=100, description="搜索关键词")
    site_id: str = Field(..., min_length=1, max_length=100, description="资源站 ID")
    vod_id: str = Field(..., min_length=1, max_length=100, description="视频 ID")
    page: int = Field(1, ge=1, description="页码")


# ========== 响应类（Response）==========


class VideoItemResponse(BaseModel):
    """视频条目响应"""

    platform: str = ""
    id: str = ""
    title: str = ""
    description: str = ""
    thumbnail: str = ""
    view_count: int = 0
    upload_date: str = ""
    channel: str = ""
    actor: str = ""
    director: str = ""
    score: str = ""
    total_episodes: str = ""
    update_time: str = ""
    area: str = ""
    language: str = ""
    year: str = ""
    status: str = ""
    type_name: str = ""
    play_sources: list[PlayLineResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class VideoSearchResponse(BaseModel):
    """视频搜索响应"""

    site_id: str
    site_name: str
    lists: list[VideoItemResponse] = Field(default_factory=list)
    pagination: PaginationInfo = Field(default_factory=PaginationInfo)
    filter_stats: FilterStatsResponse = Field(default_factory=FilterStatsResponse)
    elapsed_ms: int = 0

    model_config = ConfigDict(from_attributes=True)


class VideoDetailResponse(BaseModel):
    """视频详情响应"""

    site_id: str
    site_name: str
    video: VideoItemResponse

    model_config = ConfigDict(from_attributes=True)
