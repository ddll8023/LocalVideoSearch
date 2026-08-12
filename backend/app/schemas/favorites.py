"""视频收藏数据结构"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ========== 辅助类（Support）==========


# ========== 请求类（Request）==========


class FavoriteListRequest(BaseModel):
    """收藏列表请求"""

    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")


class FavoriteStatusRequest(BaseModel):
    """收藏状态查询请求"""

    site_id: str = Field(..., min_length=1, max_length=50, description="资源站 ID")
    vod_id: str = Field(..., min_length=1, max_length=50, description="视频 ID")


class FavoriteDeleteRequest(BaseModel):
    """收藏删除请求"""

    favorite_id: int = Field(..., ge=1, description="收藏 ID")


class FavoriteCreateRequest(BaseModel):
    """收藏创建请求"""

    site_id: str = Field(..., min_length=1, max_length=50, description="资源站 ID")
    vod_id: str = Field(..., min_length=1, max_length=50, description="视频 ID")
    title: str = Field(..., min_length=1, max_length=200, description="视频标题")
    thumbnail: str = Field("", max_length=500, description="海报地址")
    type_name: str = Field("", max_length=50, description="视频类型名")
    remarks: str = Field("", max_length=100, description="备注快照")
    keyword: str = Field(..., min_length=1, max_length=100, description="搜索关键词")


# ========== 响应类（Response）==========


class FavoriteItemResponse(BaseModel):
    """收藏条目响应"""

    id: int
    site_id: str
    vod_id: str
    title: str
    thumbnail: str = ""
    type_name: str = ""
    remarks: str = ""
    keyword: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FavoriteStatusResponse(BaseModel):
    """收藏状态响应"""

    favorited: bool = False
    favorite_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class FavoriteDeleteResponse(BaseModel):
    """收藏删除响应"""

    id: int
    message: str = ""

    model_config = ConfigDict(from_attributes=True)
