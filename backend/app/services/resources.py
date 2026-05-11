"""资源站配置服务"""
import json
import logging
import random
import shutil

import httpx
from pydantic import ValidationError

from app.constants import resources as constants_resources
from app.constants import videos as constants_videos
from app.core.config import settings
from app.schemas import resources as schemas_resources
from app.schemas.response import ErrorCode, PaginationInfo
from app.utils import http_client
from app.utils.exception import ServiceException


logger = logging.getLogger(__name__)


def get_site_list():
    """查询资源站列表"""
    sites = load_resource_config()
    total = len(sites)
    enabled_total = len([site for site in sites if site.enabled])

    return schemas_resources.ResourceSiteListResponse(
        lists=sites,
        pagination=PaginationInfo(
            page=1,
            page_size=total,
            total=total,
            total_pages=1 if total else 0,
        ),
        stats=schemas_resources.ResourceStatsResponse(
            total_sites=total,
            enabled_sites=enabled_total,
            disabled_sites=total - enabled_total,
        ),
    )


def get_site_detail(site_id: str):
    """查询资源站详情"""
    site_id = site_id.strip()
    if not site_id:
        raise ServiceException(ErrorCode.PARAM_ERROR, "资源站ID不能为空")

    site = _find_site(site_id)
    if not site:
        raise ServiceException(ErrorCode.DATA_NOT_FOUND, "资源站不存在")

    return site


def toggle_site_enabled(site_id: str):
    """切换资源站启用状态"""
    site_id = site_id.strip()
    if not site_id:
        raise ServiceException(ErrorCode.PARAM_ERROR, "资源站ID不能为空")

    sites = load_resource_config()
    target_site = None
    for site in sites:
        if site.site_id == site_id:
            target_site = site
            break

    if not target_site:
        raise ServiceException(ErrorCode.DATA_NOT_FOUND, "资源站不存在")

    target_site.enabled = not target_site.enabled
    save_resource_config(sites)

    return schemas_resources.ResourceSiteToggleResponse(
        site_id=target_site.site_id,
        enabled=target_site.enabled,
        message=f"资源站已{'启用' if target_site.enabled else '禁用'}",
    )


async def test_site_connection(site_id: str):
    """测试资源站连接"""
    site = get_site_detail(site_id)
    test_keyword = random.choice(settings.CONNECTION_TEST_KEYWORDS)
    params = http_client.build_params(
        {
            site.action_param: "detail",
            site.search_endpoint: test_keyword,
        }
    )

    try:
        async with httpx.AsyncClient() as client:
            result = await http_client.request_with_logging(
                client=client,
                site_id=site.site_id,
                site_name=site.name,
                url=site.base_url,
                params=params,
                headers=constants_videos.TEST_HEADERS,
                timeout=site.timeout,
            )
    except ServiceException:
        raise
    except Exception as exc:
        logger.error(
            f"资源站连接测试异常: site_id={site.site_id} error={exc}",
            exc_info=True,
        )
        raise ServiceException(
            ErrorCode.AI_SERVICE_ERROR,
            "服务调用失败，请稍后重试",
        ) from exc

    if not result.get("success"):
        return schemas_resources.ResourceSiteTestResponse(
            site_id=site.site_id,
            site_name=site.name,
            success=False,
            message=constants_resources.CONNECTION_FAILED_MESSAGE,
            status_code=result.get("status_code"),
            elapsed_ms=result.get("elapsed_ms", 0),
            response_size=result.get("response_size", 0),
            error=result.get("error", "连接失败"),
            test_keyword=test_keyword,
        )

    validation_result = _validate_response_content(result)
    if not validation_result["is_valid"]:
        return schemas_resources.ResourceSiteTestResponse(
            site_id=site.site_id,
            site_name=site.name,
            success=False,
            message=constants_resources.CONNECTION_FAILED_MESSAGE,
            status_code=result.get("status_code"),
            elapsed_ms=result.get("elapsed_ms", 0),
            response_size=result.get("response_size", 0),
            error=validation_result["error"],
            test_keyword=test_keyword,
        )

    return schemas_resources.ResourceSiteTestResponse(
        site_id=site.site_id,
        site_name=site.name,
        success=True,
        message=constants_resources.CONNECTION_SUCCESS_MESSAGE,
        status_code=result.get("status_code"),
        elapsed_ms=result.get("elapsed_ms", 0),
        response_size=result.get("response_size", 0),
        test_keyword=test_keyword,
    )


def validate_enabled_site(site_id: str):
    """校验资源站存在且已启用"""
    site = get_site_detail(site_id)
    if not site.enabled:
        raise ServiceException(ErrorCode.PARAM_ERROR, "资源站已禁用")
    return site


def load_resource_config():
    """加载资源站配置"""
    _ensure_resource_config_file()
    try:
        raw_text = settings.RESOURCE_CONFIG_PATH.read_text(encoding="utf-8")
        config_data = json.loads(raw_text)
        sites_data = config_data.get(constants_resources.RESOURCE_CONFIG_ROOT_KEY, [])
        return [
            schemas_resources.ResourceSiteResponse.model_validate(site_data)
            for site_data in sites_data
            if isinstance(site_data, dict) and site_data.get("site_id")
        ]
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        logger.error(f"资源站配置读取失败: error={exc}", exc_info=True)
        raise ServiceException(
            ErrorCode.INTERNAL_ERROR,
            constants_resources.CONFIG_READ_ERROR_MESSAGE,
        ) from exc


def save_resource_config(sites: list[schemas_resources.ResourceSiteResponse]):
    """保存资源站配置"""
    try:
        settings.RESOURCE_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        config_data = {
            constants_resources.RESOURCE_CONFIG_ROOT_KEY: [
                site.model_dump() for site in sites
            ]
        }
        settings.RESOURCE_CONFIG_PATH.write_text(
            json.dumps(config_data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except OSError as exc:
        logger.error(f"资源站配置保存失败: error={exc}", exc_info=True)
        raise ServiceException(
            ErrorCode.INTERNAL_ERROR,
            constants_resources.CONFIG_SAVE_ERROR_MESSAGE,
        ) from exc


"""辅助函数"""


def _ensure_resource_config_file():
    """确保可写资源站配置存在"""
    if settings.RESOURCE_CONFIG_PATH.exists():
        return

    if not settings.DEFAULT_RESOURCE_CONFIG_PATH.exists():
        raise ServiceException(ErrorCode.DATA_NOT_FOUND, "默认资源站配置不存在")

    try:
        settings.RESOURCE_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(
            settings.DEFAULT_RESOURCE_CONFIG_PATH,
            settings.RESOURCE_CONFIG_PATH,
        )
    except OSError as exc:
        logger.error(f"资源站配置初始化失败: error={exc}", exc_info=True)
        raise ServiceException(ErrorCode.INTERNAL_ERROR, "配置初始化失败") from exc


def _find_site(site_id: str):
    """查找资源站"""
    sites = load_resource_config()
    for site in sites:
        if site.site_id == site_id:
            return site
    return None


def _validate_response_content(result: dict):
    """校验资源站响应内容"""
    data = result.get("data")
    if not data:
        return {"is_valid": False, "error": "响应数据为空"}

    response_size = result.get("response_size", 0)
    if response_size < settings.CONNECTION_MIN_RESPONSE_SIZE:
        return {"is_valid": False, "error": "响应内容过短"}

    response_text = str(data).lower()
    for indicator in settings.CONNECTION_INVALID_INDICATORS:
        if indicator.lower() in response_text:
            return {"is_valid": False, "error": "检测到反爬机制"}

    if isinstance(data, dict):
        if (
            "code" in data
            and data.get("code") not in settings.CONNECTION_VALID_RESPONSE_CODES
        ):
            return {"is_valid": False, "error": "API返回错误码"}

        if "data" in data or "list" in data:
            return {"is_valid": True, "error": ""}
        return {"is_valid": False, "error": "响应缺少数据字段"}

    return {"is_valid": True, "error": ""}
