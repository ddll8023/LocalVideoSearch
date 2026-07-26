"""视频收藏 API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import favorites as schemas_favorites
from app.schemas.response import ApiResponse, PaginatedResponse, error, success
from app.services import favorites as services_favorites
from app.utils.exception import ServiceException


router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[schemas_favorites.FavoriteItemResponse]],
)
def query_favorite_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db),
):
    """分页查询收藏列表"""
    try:
        result = services_favorites.get_favorite_list(page, page_size, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/status",
    response_model=ApiResponse[schemas_favorites.FavoriteStatusResponse],
)
def query_favorite_status(
    site_id: str = Query(..., min_length=1, description="资源站 ID"),
    vod_id: str = Query(..., min_length=1, description="视频 ID"),
    db: Session = Depends(get_db),
):
    """查询视频收藏状态"""
    try:
        result = services_favorites.get_favorite_status(site_id, vod_id, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "",
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


@router.delete(
    "/{favorite_id}",
    response_model=ApiResponse[schemas_favorites.FavoriteDeleteResponse],
)
def delete_favorite(favorite_id: int, db: Session = Depends(get_db)):
    """取消收藏"""
    try:
        result = services_favorites.delete_favorite(favorite_id, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
