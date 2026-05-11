"""视频字段映射工具"""
from typing import Any


def safe_get(data: dict[str, Any], key: str, default: str = "") -> str:
    """安全获取字符串字段"""
    value = data.get(key)
    if value is None:
        return default

    text = str(value).strip()
    return text if text else default


def safe_get_int(data: dict[str, Any], key: str, default: int = 0) -> int:
    """安全获取整数字段"""
    try:
        value = data.get(key)
        if value is None or value == "":
            return default
        return int(float(str(value)))
    except (TypeError, ValueError):
        return default


def parse_play_sources(play_url_str: str, play_from_str: str = ""):
    """解析播放源字符串"""
    if not play_url_str or not isinstance(play_url_str, str):
        return {}

    play_from_list = play_from_str.split("$$$") if play_from_str else [""]
    play_url_list = play_url_str.split("$$$")

    while len(play_from_list) < len(play_url_list):
        play_from_list.append(f"source_{len(play_from_list) + 1}")

    play_sources = {}
    for play_from, play_url in zip(play_from_list, play_url_list, strict=False):
        play_from = play_from.strip()
        play_url = play_url.strip()
        if not play_url:
            continue

        episodes = []
        for episode in play_url.split("#"):
            episode = episode.strip()
            if not episode or "$" not in episode:
                continue

            name, url = episode.split("$", 1)
            name = name.strip()
            url = url.strip()
            if name and url:
                episodes.append({"name": name, "url": url})

        if not episodes:
            continue

        format_type = _identify_play_format(play_from, episodes[0]["url"])
        play_sources.setdefault(format_type, []).extend(episodes)

    return play_sources


def extract_video_items(data: dict[str, Any]):
    """从资源站响应中提取视频列表"""
    if not isinstance(data, dict):
        return []

    if isinstance(data.get("list"), list):
        return data.get("list")

    nested_data = data.get("data")
    if isinstance(nested_data, dict) and isinstance(nested_data.get("list"), list):
        return nested_data.get("list")

    if isinstance(nested_data, list):
        return nested_data

    return []


def extract_total_count(data: dict[str, Any], fallback: int = 0) -> int:
    """从资源站响应中提取总数"""
    if not isinstance(data, dict):
        return fallback

    total = _safe_to_int(data.get("total"))
    if total > 0:
        return total

    nested_data = data.get("data")
    if isinstance(nested_data, dict):
        nested_total = _safe_to_int(nested_data.get("total"))
        if nested_total > 0:
            return nested_total

    return fallback


def map_video_item(site_id: str, site_name: str, item: dict[str, Any]):
    """映射单个视频条目"""
    if not isinstance(item, dict):
        return {
            "platform": site_name or site_id,
            "id": "",
            "title": "",
            "play_sources": {},
        }

    view_count = safe_get_int(item, "vod_hits")
    if view_count == 0:
        view_count = safe_get_int(item, "view_count")

    return {
        "platform": site_name or site_id,
        "id": safe_get(item, "vod_id"),
        "title": safe_get(item, "vod_name"),
        "description": safe_get(item, "vod_content"),
        "thumbnail": safe_get(item, "vod_pic"),
        "view_count": view_count,
        "upload_date": safe_get(item, "vod_pubdate"),
        "channel": safe_get(item, "vod_class"),
        "actor": safe_get(item, "vod_actor"),
        "area": safe_get(item, "vod_area"),
        "language": safe_get(item, "vod_lang"),
        "year": safe_get(item, "vod_year"),
        "status": safe_get(item, "vod_remarks"),
        "type_name": safe_get(item, "type_name"),
        "play_sources": parse_play_sources(
            safe_get(item, "vod_play_url"),
            safe_get(item, "vod_play_from"),
        ),
    }


"""辅助函数"""


def _identify_play_format(play_from: str, sample_url: str) -> str:
    """识别播放格式"""
    sample_url_lower = sample_url.lower()
    play_from_lower = play_from.lower()

    for format_type in ["m3u8", "mp4", "flv", "avi"]:
        if f".{format_type}" in sample_url_lower or format_type in play_from_lower:
            return format_type

    if any(ext in sample_url_lower for ext in [".mkv", ".rmvb"]):
        return "mp4"

    if "share" in sample_url_lower or "share" in play_from_lower:
        return "mp4"

    return "mp4"


def _safe_to_int(value: Any) -> int:
    """安全转换整数"""
    try:
        if value is None or value == "":
            return 0
        return int(float(str(value)))
    except (TypeError, ValueError):
        return 0
