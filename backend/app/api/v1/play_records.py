"""播放记录 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas import play_records as schemas_play_records
from app.schemas.response import ApiResponse, PaginatedResponse, error, success
from app.services import play_records as services_play_records
from app.utils.exception import ServiceException


router = APIRouter(prefix="/play-records", tags=["play-records"])


@router.post(
    "/list",
    response_model=ApiResponse[
        PaginatedResponse[schemas_play_records.PlayRecordItemResponse]
    ],
)
def query_play_record_list(
    data: schemas_play_records.PlayRecordListRequest,
    db: Session = Depends(get_db),
):
    """分页查询播放记录列表"""
    try:
        result = services_play_records.get_play_record_list(data.page, data.page_size, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/detail",
    response_model=ApiResponse[schemas_play_records.PlayRecordItemResponse | None],
)
def query_play_record_detail(
    data: schemas_play_records.PlayRecordDetailRequest,
    db: Session = Depends(get_db),
):
    """查询单个视频的播放记录"""
    try:
        result = services_play_records.get_play_record_detail(
            data.site_id,
            data.vod_id,
            db,
        )
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/upsert",
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


@router.post(
    "/delete",
    response_model=ApiResponse[schemas_play_records.PlayRecordDeleteResponse],
)
def delete_play_record(
    data: schemas_play_records.PlayRecordDeleteRequest,
    db: Session = Depends(get_db),
):
    """删除单条播放记录"""
    try:
        result = services_play_records.delete_play_record(data.record_id, db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/clear",
    response_model=ApiResponse[schemas_play_records.PlayRecordDeleteResponse],
)
def clear_play_records(
    _request: schemas_play_records.PlayRecordClearRequest,
    db: Session = Depends(get_db),
):
    """清空播放记录"""
    try:
        result = services_play_records.clear_play_records(db)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
