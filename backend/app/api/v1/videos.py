"""视频 API"""
from fastapi import APIRouter, Depends

from app.schemas import videos as schemas_videos
from app.schemas.response import ApiResponse, error, success
from app.services import videos as services_videos
from app.utils.exception import ServiceException


router = APIRouter(prefix="/videos", tags=["videos"])


@router.get(
    "/search",
    response_model=ApiResponse[schemas_videos.VideoSearchResponse],
)
async def query_video_list(query: schemas_videos.VideoSearchRequest = Depends()):
    """查询视频列表"""
    try:
        result = await services_videos.query_video_list(query)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/detail",
    response_model=ApiResponse[schemas_videos.VideoDetailResponse],
)
async def query_video_detail(query: schemas_videos.VideoDetailRequest = Depends()):
    """查询视频详情"""
    try:
        result = await services_videos.query_video_detail(query)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
