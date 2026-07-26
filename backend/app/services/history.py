"""搜索历史服务"""
import logging

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.db.database import commit_or_rollback
from app.models.search_history import SearchHistory
from app.schemas import history as schemas_history
from app.schemas.response import ErrorCode, PaginatedResponse, PaginationInfo
from app.utils.exception import ServiceException


logger = logging.getLogger(__name__)


def get_history_list(limit: int, db: Session):
    """查询最近搜索历史列表"""
    total = db.scalar(select(func.count()).select_from(SearchHistory)) or 0
    items = db.scalars(
        select(SearchHistory).order_by(SearchHistory.updated_at.desc()).limit(limit)
    ).all()

    return PaginatedResponse(
        lists=[
            schemas_history.SearchHistoryItemResponse.model_validate(item)
            for item in items
        ],
        pagination=PaginationInfo(
            page=1,
            page_size=limit,
            total=total,
            total_pages=1 if total else 0,
        ),
    )


def record_search_keyword(data: schemas_history.SearchHistoryCreateRequest, db: Session):
    """记录搜索关键词，已存在则累加计数"""
    keyword = data.keyword.strip()
    if not keyword:
        raise ServiceException(ErrorCode.PARAM_ERROR, "搜索关键词不能为空")

    entity = db.scalar(select(SearchHistory).where(SearchHistory.keyword == keyword))
    if entity:
        entity.search_count += 1
        entity.updated_at = func.now()
    else:
        entity = SearchHistory(keyword=keyword)
        db.add(entity)

    commit_or_rollback(db)
    db.refresh(entity)
    return schemas_history.SearchHistoryItemResponse.model_validate(entity)


def delete_history(history_id: int, db: Session):
    """删除单条搜索历史"""
    entity = db.get(SearchHistory, history_id)
    if not entity:
        raise ServiceException(ErrorCode.DATA_NOT_FOUND, "搜索历史不存在")

    db.delete(entity)
    commit_or_rollback(db)
    return schemas_history.SearchHistoryDeleteResponse(
        deleted_count=1,
        message="搜索历史已删除",
    )


def clear_history(db: Session):
    """清空搜索历史"""
    total = db.scalar(select(func.count()).select_from(SearchHistory)) or 0
    db.execute(delete(SearchHistory))
    commit_or_rollback(db)
    logger.info(f"清空搜索历史: deleted_count={total}")
    return schemas_history.SearchHistoryDeleteResponse(
        deleted_count=total,
        message="搜索历史已清空",
    )
