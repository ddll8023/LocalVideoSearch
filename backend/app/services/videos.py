"""视频搜索服务"""
import logging
import math
import time

import httpx

from app.constants import videos as constants_videos
from app.core.config import settings
from app.schemas import videos as schemas_videos
from app.schemas.response import ErrorCode, PaginationInfo
from app.services import resources as services_resources
from app.utils import http_client, video_mapper
from app.utils.exception import ServiceException


logger = logging.getLogger(__name__)

_search_cache: dict[tuple, tuple[float, object]] = {}


async def query_video_list(query: schemas_videos.VideoSearchRequest):
    """查询视频列表"""
    try:
        wd = query.wd.strip()
        if not wd:
            raise ServiceException(ErrorCode.PARAM_ERROR, "搜索关键词不能为空")

        site = services_resources.validate_enabled_site(query.site_id)
        cache_key = (
            site.site_id,
            _normalize_keyword(wd),
            query.page,
            query.page_size,
        )
        cached_result = _get_cached_search(cache_key)
        if cached_result is not None:
            return cached_result

        client = http_client.get_shared_client()
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

        result = schemas_videos.VideoSearchResponse(
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
        _set_cached_search(cache_key, result)
        return result
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

        # 即使命中缓存，详情查询仍需校验资源站当前可用状态。
        services_resources.validate_enabled_site(query.site_id)
        search_result = _get_cached_search(
            (
                query.site_id,
                _normalize_keyword(keyword),
                query.page,
                settings.DEFAULT_PAGE_SIZE,
            )
        )
        if search_result is None:
            search_query = schemas_videos.VideoSearchRequest(
                wd=keyword,
                site_id=query.site_id,
                page=query.page,
                page_size=settings.DEFAULT_PAGE_SIZE,
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
        data_counter=lambda data: len(video_mapper.extract_video_items(data)),
    )


"""辅助函数"""


def _get_cached_search(cache_key: tuple):
    """读取未过期的搜索结果缓存，并惰性清理已过期条目"""
    _purge_expired_search_cache()
    entry = _search_cache.get(cache_key)
    if not entry:
        return None

    cached_at, value = entry
    if time.time() - cached_at > settings.SEARCH_CACHE_TTL_SECONDS:
        _search_cache.pop(cache_key, None)
        return None
    return value


def _set_cached_search(cache_key: tuple, value):
    """写入搜索结果缓存，超容量时淘汰最旧条目"""
    _purge_expired_search_cache()
    if settings.SEARCH_CACHE_MAX_ENTRIES <= 0:
        return
    if len(_search_cache) >= settings.SEARCH_CACHE_MAX_ENTRIES:
        oldest_key = min(_search_cache, key=lambda key: _search_cache[key][0])
        _search_cache.pop(oldest_key, None)
    _search_cache[cache_key] = (time.time(), value)


def _purge_expired_search_cache():
    """清理超过 TTL 的搜索缓存条目"""
    now = time.time()
    expired_keys = [
        key
        for key, (cached_at, _) in _search_cache.items()
        if now - cached_at > settings.SEARCH_CACHE_TTL_SECONDS
    ]
    for key in expired_keys:
        _search_cache.pop(key, None)


def _normalize_keyword(keyword: str) -> str:
    """生成用于缓存的规范化关键词"""
    return keyword.strip().casefold()
