"""搜索历史数据结构"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ========== 辅助类（Support）==========


# ========== 请求类（Request）==========


class SearchHistoryListRequest(BaseModel):
    """搜索历史列表请求"""

    limit: int = Field(10, ge=1, le=50, description="返回条数")


class SearchHistoryDeleteRequest(BaseModel):
    """搜索历史删除请求"""

    history_id: int = Field(..., ge=1, description="搜索历史 ID")


class SearchHistoryClearRequest(BaseModel):
    """搜索历史清空请求"""

    model_config = ConfigDict(extra="forbid")


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
