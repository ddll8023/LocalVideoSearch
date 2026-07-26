"""资源站 HTTP 请求工具"""
import json
import logging
import time
from typing import Any

import httpx

from app.core.logging import RequestLogger
from app.utils import video_mapper


logger = logging.getLogger(__name__)

_shared_client: httpx.AsyncClient | None = None


def get_shared_client():
    """获取应用级共享 HTTP 客户端，复用连接池"""
    global _shared_client
    if _shared_client is None:
        _shared_client = httpx.AsyncClient()
    return _shared_client


async def close_shared_client():
    """关闭应用级共享 HTTP 客户端"""
    global _shared_client
    if _shared_client is not None:
        await _shared_client.aclose()
        _shared_client = None


def build_params(param_mapping: dict[str, Any]):
    """构建请求参数"""
    return {key: value for key, value in param_mapping.items() if value is not None}


async def request_with_logging(
    client: httpx.AsyncClient,
    site_id: str,
    site_name: str,
    url: str,
    params: dict[str, Any],
    headers: dict[str, str],
    timeout: int = 15,
):
    """发送 HTTP 请求并记录日志"""
    request_logger = RequestLogger(site_name=site_name)
    start_time = time.perf_counter()
    request_id = request_logger.log_request_start(url=url, params=params)

    try:
        response = await client.get(url, params=params, headers=headers, timeout=timeout)
        elapsed_ms = _calculate_elapsed_ms(start_time)
        response_text = response.text
        response_size = len(response_text.encode("utf-8"))

        if response.status_code >= 400:
            request_logger.log_request_error(
                request_id=request_id,
                error_message="响应状态异常",
                elapsed_ms=elapsed_ms,
                status_code=response.status_code,
            )
            return {
                "success": False,
                "error": "响应状态异常",
                "status_code": response.status_code,
                "elapsed_ms": elapsed_ms,
                "response_size": response_size,
                "site_id": site_id,
            }

        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            request_logger.log_request_error(
                request_id=request_id,
                error_message="服务响应解析失败",
                elapsed_ms=elapsed_ms,
                status_code=response.status_code,
            )
            return {
                "success": False,
                "error": "服务响应解析失败",
                "status_code": response.status_code,
                "elapsed_ms": elapsed_ms,
                "response_size": response_size,
                "site_id": site_id,
            }

        data_count = len(video_mapper.extract_video_items(data))
        request_logger.log_request_success(
            request_id=request_id,
            status_code=response.status_code,
            elapsed_ms=elapsed_ms,
            data_count=data_count,
        )
        return {
            "success": True,
            "data": data,
            "status_code": response.status_code,
            "elapsed_ms": elapsed_ms,
            "response_size": response_size,
            "site_id": site_id,
        }

    except httpx.TimeoutException:
        elapsed_ms = _calculate_elapsed_ms(start_time)
        request_logger.log_request_timeout(
            request_id=request_id,
            timeout=timeout,
            elapsed_ms=elapsed_ms,
        )
        return {
            "success": False,
            "error": "请求超时",
            "status_code": None,
            "elapsed_ms": elapsed_ms,
            "response_size": 0,
            "site_id": site_id,
        }

    except httpx.HTTPError:
        elapsed_ms = _calculate_elapsed_ms(start_time)
        request_logger.log_request_error(
            request_id=request_id,
            error_message="网络请求失败",
            elapsed_ms=elapsed_ms,
        )
        return {
            "success": False,
            "error": "网络请求失败",
            "status_code": None,
            "elapsed_ms": elapsed_ms,
            "response_size": 0,
            "site_id": site_id,
        }

    except Exception as exc:
        elapsed_ms = _calculate_elapsed_ms(start_time)
        logger.error(f"HTTP请求异常: site_id={site_id} error={exc}", exc_info=True)
        request_logger.log_request_error(
            request_id=request_id,
            error_message="网络请求失败",
            elapsed_ms=elapsed_ms,
        )
        return {
            "success": False,
            "error": "网络请求失败",
            "status_code": None,
            "elapsed_ms": elapsed_ms,
            "response_size": 0,
            "site_id": site_id,
        }


"""辅助函数"""


def _calculate_elapsed_ms(start_time: float) -> int:
    """计算请求耗时"""
    return int((time.perf_counter() - start_time) * 1000)
