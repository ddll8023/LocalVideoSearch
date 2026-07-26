"""播放记录 API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import play_records as schemas_play_records
from app.schemas.response import ApiResponse, PaginatedResponse, error, success
from app.services import play_records as services_play_records
from app.utils.exception import ServiceException


router = APIRouter(prefix="/play-records", tags=["play-records"])


@router.get(
    "",
    response_model=ApiResponse[
        PaginatedResponse[schemas_play_records.PlayRecordItemResponse]
    ],
)
def query_play_record_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db),
):
    """分页查询播放记录列表"""
    try:
        result = services_play_records.get_play_record_list(page, page_size, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/detail",
    response_model=ApiResponse[schemas_play_records.PlayRecordItemResponse | None],
)
def query_play_record_detail(
    site_id: str = Query(..., min_length=1, description="资源站 ID"),
    vod_id: str = Query(..., min_length=1, description="视频 ID"),
    db: Session = Depends(get_db),
):
    """查询单个视频的播放记录"""
    try:
        result = services_play_records.get_play_record_detail(site_id, vod_id, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.put(
    "",
    response_model=ApiResponse[schemas_play_records.PlayRecordItemResponse],
)
def upsert_play_record(
    data: schemas_play_records.PlayRecordUpsertRequest,
    db: Session = Depends(get_db),
):
    """写入播放记录"""
    try:
        result = services_play_records.upsert_play_record(data, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.delete(
    "/{record_id}",
    response_model=ApiResponse[schemas_play_records.PlayRecordDeleteResponse],
)
def delete_play_record(record_id: int, db: Session = Depends(get_db)):
    """删除单条播放记录"""
    try:
        result = services_play_records.delete_play_record(record_id, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.delete(
    "",
    response_model=ApiResponse[schemas_play_records.PlayRecordDeleteResponse],
)
def clear_play_records(db: Session = Depends(get_db)):
    """清空播放记录"""
    try:
        result = services_play_records.clear_play_records(db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
