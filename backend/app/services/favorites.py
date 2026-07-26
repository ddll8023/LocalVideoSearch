"""视频收藏服务"""
import logging
import math

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.db.database import commit_or_rollback
from app.models.favorite import Favorite
from app.schemas import favorites as schemas_favorites
from app.schemas.response import ErrorCode, PaginatedResponse, PaginationInfo
from app.utils.exception import ServiceException


logger = logging.getLogger(__name__)


def get_favorite_list(page: int, page_size: int, db: Session):
    """分页查询收藏列表"""
    total = db.scalar(select(func.count()).select_from(Favorite)) or 0
    items = db.scalars(
        select(Favorite)
        .order_by(Favorite.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return PaginatedResponse(
        lists=[
            schemas_favorites.FavoriteItemResponse.model_validate(item)
            for item in items
        ],
        pagination=PaginationInfo(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total else 0,
        ),
    )


def create_favorite(data: schemas_favorites.FavoriteCreateRequest, db: Session):
    """添加收藏，已存在则幂等返回"""
    entity = db.scalar(
        select(Favorite).where(
            and_(Favorite.site_id == data.site_id, Favorite.vod_id == data.vod_id)
        )
    )
    if entity:
        return schemas_favorites.FavoriteItemResponse.model_validate(entity)

    entity = Favorite(**data.model_dump())
    db.add(entity)
    commit_or_rollback(db)
    db.refresh(entity)
    logger.info(f"添加收藏: site_id={data.site_id} vod_id={data.vod_id}")
    return schemas_favorites.FavoriteItemResponse.model_validate(entity)


def get_favorite_status(site_id: str, vod_id: str, db: Session):
    """查询视频收藏状态"""
    entity = db.scalar(
        select(Favorite).where(
            and_(Favorite.site_id == site_id, Favorite.vod_id == vod_id)
        )
    )
    return schemas_favorites.FavoriteStatusResponse(
        favorited=entity is not None,
        favorite_id=entity.id if entity else None,
    )


def delete_favorite(favorite_id: int, db: Session):
    """取消收藏"""
    entity = db.get(Favorite, favorite_id)
    if not entity:
        raise ServiceException(ErrorCode.DATA_NOT_FOUND, "收藏不存在")

    db.delete(entity)
    commit_or_rollback(db)
    logger.info(f"取消收藏: favorite_id={favorite_id}")
    return schemas_favorites.FavoriteDeleteResponse(
        id=favorite_id,
        message="已取消收藏",
    )
