"""搜索历史数据结构"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ========== 辅助类（Support）==========


# ========== 请求类（Request）==========


class SearchHistoryCreateRequest(BaseModel):
    """搜索历史记录请求"""

    keyword: str = Field(..., min_length=1, max_length=100, description="搜索关键词")


# ========== 响应类（Response）==========


class SearchHistoryItemResponse(BaseModel):
    """搜索历史条目响应"""

    id: int
    keyword: str
    search_count: int = 1
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SearchHistoryDeleteResponse(BaseModel):
    """搜索历史删除响应"""

    deleted_count: int = 0
    message: str = ""

    model_config = ConfigDict(from_attributes=True)
