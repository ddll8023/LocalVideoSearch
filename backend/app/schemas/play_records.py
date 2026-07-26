"""播放记录数据结构"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ========== 辅助类（Support）==========


# ========== 请求类（Request）==========


class PlayRecordUpsertRequest(BaseModel):
    """播放记录写入请求"""

    site_id: str = Field(..., min_length=1, max_length=50, description="资源站 ID")
    vod_id: str = Field(..., min_length=1, max_length=50, description="视频 ID")
    title: str = Field(..., min_length=1, max_length=200, description="视频标题")
    thumbnail: str = Field("", max_length=500, description="海报地址")
    keyword: str = Field(..., min_length=1, max_length=100, description="搜索关键词")
    line_name: str = Field("", max_length=100, description="播放线路名")
    episode_index: int = Field(0, ge=0, description="剧集索引")
    episode_name: str = Field("", max_length=100, description="剧集名称")
    position_seconds: int = Field(0, ge=0, description="播放位置（秒）")
    duration_seconds: int = Field(0, ge=0, description="视频总时长（秒）")


# ========== 响应类（Response）==========


class PlayRecordItemResponse(BaseModel):
    """播放记录条目响应"""

    id: int
    site_id: str
    vod_id: str
    title: str
    thumbnail: str = ""
    keyword: str
    line_name: str = ""
    episode_index: int = 0
    episode_name: str = ""
    position_seconds: int = 0
    duration_seconds: int = 0
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlayRecordDeleteResponse(BaseModel):
    """播放记录删除响应"""

    deleted_count: int = 0
    message: str = ""

    model_config = ConfigDict(from_attributes=True)
