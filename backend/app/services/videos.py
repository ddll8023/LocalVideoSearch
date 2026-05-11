"""视频搜索服务"""
import logging
import math

import httpx

from app.constants import videos as constants_videos
from app.core.config import settings
from app.schemas import videos as schemas_videos
from app.schemas.response import ErrorCode, PaginationInfo
from app.services import resources as services_resources
from app.utils import http_client, video_mapper
from app.utils.exception import ServiceException


logger = logging.getLogger(__name__)


async def query_video_list(query: schemas_videos.VideoSearchRequest):
    """查询视频列表"""
    try:
        wd = query.wd.strip()
        if not wd:
            raise ServiceException(ErrorCode.PARAM_ERROR, "搜索关键词不能为空")

        site = services_resources.validate_enabled_site(query.site_id)

        async with httpx.AsyncClient() as client:
            site_result = await fetch_site_raw(client, site, wd, query.page)

        if not site_result.get("success"):
            raise ServiceException(
                ErrorCode.AI_SERVICE_ERROR,
                "服务调用失败，请稍后重试",
            )

        data = site_result.get("data", {})
        if not isinstance(data, dict):
            raise ServiceException(
                ErrorCode.AI_SERVICE_ERROR,
                "服务调用失败，请稍后重试",
            )

        items = video_mapper.extract_video_items(data)
        total_count = video_mapper.extract_total_count(data, len(items))
        original_count = len(items)
        filtered_count = 0
        videos = []

        for item in items:
            if not isinstance(item, dict):
                continue

            if item.get("type_name", "") in constants_videos.FILTERED_TYPE_NAMES:
                filtered_count += 1
                continue

            video_data = video_mapper.map_video_item(site.site_id, site.name, item)
            if video_data["id"] and video_data["title"]:
                videos.append(
                    schemas_videos.VideoItemResponse.model_validate(video_data)
                )

        return schemas_videos.VideoSearchResponse(
            site_id=site.site_id,
            site_name=site.name,
            lists=videos,
            pagination=PaginationInfo(
                page=query.page,
                page_size=query.page_size,
                total=total_count,
                total_pages=math.ceil(total_count / query.page_size)
                if total_count
                else 0,
            ),
            filter_stats=schemas_videos.FilterStatsResponse(
                original_count=original_count,
                filtered_count=filtered_count,
                display_count=len(videos),
            ),
            elapsed_ms=site_result.get("elapsed_ms", 0),
        )
    except ServiceException:
        raise
    except Exception as exc:
        logger.error(
            f"视频搜索异常: site_id={query.site_id} error={exc}",
            exc_info=True,
        )
        raise ServiceException(
            ErrorCode.AI_SERVICE_ERROR,
            "服务调用失败，请稍后重试",
        ) from exc


async def query_video_detail(query: schemas_videos.VideoDetailRequest):
    """查询视频详情"""
    try:
        keyword = query.keyword.strip()
        vod_id = query.vod_id.strip()
        if not keyword or not vod_id:
            raise ServiceException(ErrorCode.PARAM_ERROR, "参数错误")

        search_query = schemas_videos.VideoSearchRequest(
            wd=keyword,
            site_id=query.site_id,
            page=query.page,
            page_size=min(settings.MAX_PAGE_SIZE, 100),
        )
        search_result = await query_video_list(search_query)

        for video in search_result.lists:
            if str(video.id) == str(vod_id):
                return schemas_videos.VideoDetailResponse(
                    site_id=search_result.site_id,
                    site_name=search_result.site_name,
                    video=video,
                )

        raise ServiceException(ErrorCode.DATA_NOT_FOUND, "视频不存在")
    except ServiceException:
        raise
    except Exception as exc:
        logger.error(
            f"视频详情异常: site_id={query.site_id} vod_id={query.vod_id} error={exc}",
            exc_info=True,
        )
        raise ServiceException(ErrorCode.INTERNAL_ERROR, "操作失败") from exc


async def fetch_site_raw(
    client: httpx.AsyncClient,
    site,
    wd: str,
    page: int,
):
    """获取资源站原始响应"""
    params = http_client.build_params(
        {
            site.action_param: "detail",
            site.search_endpoint: wd,
            site.page_param: page,
        }
    )
    return await http_client.request_with_logging(
        client=client,
        site_id=site.site_id,
        site_name=site.name,
        url=site.base_url,
        params=params,
        headers=constants_videos.SEARCH_HEADERS,
        timeout=site.timeout,
    )


"""辅助函数"""
