"""搜索历史 API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import history as schemas_history
from app.schemas.response import ApiResponse, PaginatedResponse, error, success
from app.services import history as services_history
from app.utils.exception import ServiceException


router = APIRouter(prefix="/history", tags=["history"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[schemas_history.SearchHistoryItemResponse]],
)
def query_search_history_list(
    limit: int = Query(10, ge=1, le=50, description="返回条数"),
    db: Session = Depends(get_db),
):
    """查询最近搜索历史"""
    try:
        result = services_history.get_history_list(limit, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "",
    response_model=ApiResponse[schemas_history.SearchHistoryItemResponse],
)
def record_search_history(
    data: schemas_history.SearchHistoryCreateRequest,
    db: Session = Depends(get_db),
):
    """记录搜索关键词"""
    try:
        result = services_history.record_search_keyword(data, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.delete(
    "/{history_id}",
    response_model=ApiResponse[schemas_history.SearchHistoryDeleteResponse],
)
def delete_search_history(history_id: int, db: Session = Depends(get_db)):
    """删除单条搜索历史"""
    try:
        result = services_history.delete_history(history_id, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.delete(
    "",
    response_model=ApiResponse[schemas_history.SearchHistoryDeleteResponse],
)
def clear_search_history(db: Session = Depends(get_db)):
    """清空搜索历史"""
    try:
        result = services_history.clear_history(db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
