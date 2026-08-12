"""视频收藏 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import favorites as schemas_favorites
from app.schemas.response import ApiResponse, PaginatedResponse, error, success
from app.services import favorites as services_favorites
from app.utils.exception import ServiceException


router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.post(
    "/list",
    response_model=ApiResponse[PaginatedResponse[schemas_favorites.FavoriteItemResponse]],
)
def query_favorite_list(
    data: schemas_favorites.FavoriteListRequest,
    db: Session = Depends(get_db),
):
    """分页查询收藏列表"""
    try:
        result = services_favorites.get_favorite_list(data.page, data.page_size, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/status",
    response_model=ApiResponse[schemas_favorites.FavoriteStatusResponse],
)
def query_favorite_status(
    data: schemas_favorites.FavoriteStatusRequest,
    db: Session = Depends(get_db),
):
    """查询视频收藏状态"""
    try:
        result = services_favorites.get_favorite_status(data.site_id, data.vod_id, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/add",
    response_model=ApiResponse[schemas_favorites.FavoriteItemResponse],
)
def create_favorite(
    data: schemas_favorites.FavoriteCreateRequest,
    db: Session = Depends(get_db),
):
    """添加收藏"""
    try:
        result = services_favorites.create_favorite(data, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/remove",
    response_model=ApiResponse[schemas_favorites.FavoriteDeleteResponse],
)
def delete_favorite(
    data: schemas_favorites.FavoriteDeleteRequest,
    db: Session = Depends(get_db),
):
    """取消收藏"""
    try:
        result = services_favorites.delete_favorite(data.favorite_id, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
