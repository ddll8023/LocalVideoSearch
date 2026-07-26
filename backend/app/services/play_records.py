"""播放记录服务"""
import logging
import math

from sqlalchemy import and_, delete, func, select
from sqlalchemy.orm import Session

from app.db.database import commit_or_rollback
from app.models.play_record import PlayRecord
from app.schemas import play_records as schemas_play_records
from app.schemas.response import ErrorCode, PaginatedResponse, PaginationInfo
from app.utils.exception import ServiceException


logger = logging.getLogger(__name__)


def get_play_record_list(page: int, page_size: int, db: Session):
    """分页查询播放记录列表"""
    total = db.scalar(select(func.count()).select_from(PlayRecord)) or 0
    items = db.scalars(
        select(PlayRecord)
        .order_by(PlayRecord.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return PaginatedResponse(
        lists=[
            schemas_play_records.PlayRecordItemResponse.model_validate(item)
            for item in items
        ],
        pagination=PaginationInfo(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total else 0,
        ),
    )


def get_play_record_detail(site_id: str, vod_id: str, db: Session):
    """查询单个视频的播放记录，不存在时返回 None"""
    entity = db.scalar(
        select(PlayRecord).where(
            and_(PlayRecord.site_id == site_id, PlayRecord.vod_id == vod_id)
        )
    )
    if not entity:
        return None
    return schemas_play_records.PlayRecordItemResponse.model_validate(entity)


def upsert_play_record(data: schemas_play_records.PlayRecordUpsertRequest, db: Session):
    """写入播放记录，同一视频存在则更新"""
    entity = db.scalar(
        select(PlayRecord).where(
            and_(PlayRecord.site_id == data.site_id, PlayRecord.vod_id == data.vod_id)
        )
    )
    if entity:
        for key, value in data.model_dump().items():
            setattr(entity, key, value)
        entity.updated_at = func.now()
    else:
        entity = PlayRecord(**data.model_dump())
        db.add(entity)

    commit_or_rollback(db)
    db.refresh(entity)
    return schemas_play_records.PlayRecordItemResponse.model_validate(entity)


def delete_play_record(record_id: int, db: Session):
    """删除单条播放记录"""
    entity = db.get(PlayRecord, record_id)
    if not entity:
        raise ServiceException(ErrorCode.DATA_NOT_FOUND, "播放记录不存在")

    db.delete(entity)
    commit_or_rollback(db)
    return schemas_play_records.PlayRecordDeleteResponse(
        deleted_count=1,
        message="播放记录已删除",
    )


def clear_play_records(db: Session):
    """清空播放记录"""
    total = db.scalar(select(func.count()).select_from(PlayRecord)) or 0
    db.execute(delete(PlayRecord))
    commit_or_rollback(db)
    logger.info(f"清空播放记录: deleted_count={total}")
    return schemas_play_records.PlayRecordDeleteResponse(
        deleted_count=total,
        message="播放记录已清空",
    )
