"""监控聚合服务"""
from datetime import datetime, timedelta
import time
from urllib.parse import parse_qs, urlparse

from app.schemas import monitor as schemas_monitor
from app.services import logs as services_logs


# 监控日志读取缓存的 TTL（秒）
MONITOR_CACHE_TTL_SECONDS = 30

# 进程内缓存：{hours_back: (缓存时间戳, 日志条目列表)}
_entries_cache: dict[int, tuple[float, list[dict]]] = {}


def get_dashboard_overview():
    """获取仪表板概览"""
    entries = _get_entries_cached(24)
    requests = _get_completed_requests(entries)
    success_count = len([entry for entry in requests if _is_success_request(entry)])
    error_count = len([entry for entry in entries if entry.get("level") == "ERROR"])

    return schemas_monitor.DashboardOverviewResponse(
        search_count=len(requests),
        success_rate=_build_rate(success_count, len(requests)),
        average_response_time=_average_response_time(requests),
        error_count=error_count,
        request_count=len(requests),
    )


def get_search_stats(hours: int):
    """获取搜索统计"""
    entries = _get_entries_cached(hours)
    requests = _get_completed_requests(entries)
    success_count = len([entry for entry in requests if _is_success_request(entry)])
    failed_count = len(requests) - success_count

    return schemas_monitor.SearchStatsResponse(
        hours=hours,
        total_searches=len(requests),
        success_count=success_count,
        failed_count=failed_count,
        success_rate=_build_rate(success_count, len(requests)),
        average_response_time=_average_response_time(requests),
    )


def get_system_health_stats(hours: int):
    """获取系统健康统计"""
    entries = _get_entries_cached(hours)
    requests = _get_completed_requests(entries)
    error_count = len([entry for entry in entries if entry.get("level") == "ERROR"])
    warning_count = len([entry for entry in entries if entry.get("level") == "WARNING"])

    status = "healthy"
    if error_count:
        status = "warning"
    if error_count >= 10:
        status = "error"

    return schemas_monitor.SystemHealthResponse(
        hours=hours,
        status=status,
        error_count=error_count,
        warning_count=warning_count,
        average_response_time=_average_response_time(requests),
        latest_log_time=str(entries[0].get("time") or "") if entries else "",
    )


def get_real_time_data():
    """获取实时摘要"""
    entries = _get_entries_cached(1)
    requests = _get_completed_requests(entries)
    errors = [entry for entry in entries if entry.get("level") == "ERROR"]

    return schemas_monitor.RealTimeSummaryResponse(
        running=True,
        generated_at=datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        latest_log_time=str(entries[0].get("time") or "") if entries else "",
        recent_requests=len(requests),
        recent_errors=len(errors),
    )


def get_site_performance(hours: int):
    """获取站点性能"""
    entries = _get_entries_cached(hours)
    site_map = {}
    for entry in _get_completed_requests(entries):
        site = str(entry.get("site") or "未知站点")
        site_data = site_map.setdefault(
            site,
            {
                "site": site,
                "request_count": 0,
                "success_count": 0,
                "error_count": 0,
                "elapsed_total": 0,
            },
        )
        site_data["request_count"] += 1
        site_data["elapsed_total"] += int(entry.get("elapsed_ms") or 0)
        if _is_success_request(entry):
            site_data["success_count"] += 1
        else:
            site_data["error_count"] += 1

    items = []
    for site_data in site_map.values():
        request_count = site_data["request_count"]
        items.append(
            schemas_monitor.SitePerformanceItemResponse(
                site=site_data["site"],
                request_count=request_count,
                success_count=site_data["success_count"],
                error_count=site_data["error_count"],
                success_rate=_build_rate(site_data["success_count"], request_count),
                average_response_time=round(site_data["elapsed_total"] / request_count)
                if request_count
                else 0,
            )
        )

    items.sort(key=lambda item: item.request_count, reverse=True)
    return schemas_monitor.SitePerformanceResponse(hours=hours, lists=items)


def get_trends(hours: int):
    """获取趋势数据"""
    entries = _get_entries_cached(hours)
    requests = _get_completed_requests(entries)
    bucket_map = _build_trend_buckets(hours)

    for entry in requests:
        bucket_key = _format_hour_key(int(entry.get("timestamp") or 0))
        if bucket_key not in bucket_map:
            continue
        bucket_map[bucket_key]["search_count"] += 1
        bucket_map[bucket_key]["elapsed_total"] += int(entry.get("elapsed_ms") or 0)
        if not _is_success_request(entry):
            bucket_map[bucket_key]["error_count"] += 1

    return schemas_monitor.TrendsResponse(
        hours=hours,
        lists=[
            schemas_monitor.TrendPointResponse(
                label=data["label"],
                search_count=data["search_count"],
                error_count=data["error_count"],
                average_response_time=round(data["elapsed_total"] / data["search_count"])
                if data["search_count"]
                else 0,
            )
            for data in bucket_map.values()
        ],
    )


def get_hot_keywords(hours: int, limit: int):
    """获取热门关键词"""
    entries = _get_entries_cached(hours)
    keyword_counts = {}
    for entry in entries:
        keyword = _extract_keyword(entry)
        if not keyword:
            continue
        keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1

    sorted_keywords = sorted(
        keyword_counts.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    return schemas_monitor.HotKeywordsResponse(
        hours=hours,
        lists=[
            schemas_monitor.HotKeywordItemResponse(keyword=keyword, count=count)
            for keyword, count in sorted_keywords[:limit]
        ],
    )


"""辅助函数"""


def _get_entries_cached(hours_back: int):
    """读取日志条目（带进程内 TTL 缓存）"""
    now = time.time()
    cached = _entries_cache.get(hours_back)
    if cached and now - cached[0] < MONITOR_CACHE_TTL_SECONDS:
        return cached[1]
    entries = services_logs.read_log_entries(hours_back=hours_back)
    _entries_cache[hours_back] = (now, entries)
    return entries


def _get_completed_requests(entries: list[dict]):
    """获取已完成请求日志"""
    return [
        entry
        for entry in entries
        if entry.get("log_type") == "request"
        and (
            entry.get("elapsed_ms") is not None
            or entry.get("status") is not None
            or entry.get("error")
        )
    ]


def _is_success_request(entry: dict):
    """判断请求是否成功"""
    status = entry.get("status")
    if entry.get("error") or entry.get("level") in ["ERROR", "WARNING"]:
        return False
    if status is None:
        return True
    try:
        status_code = int(status)
    except (TypeError, ValueError):
        return False
    return 200 <= status_code < 400


def _average_response_time(entries: list[dict]):
    """计算平均响应时间"""
    elapsed_values = [int(entry.get("elapsed_ms") or 0) for entry in entries]
    elapsed_values = [value for value in elapsed_values if value > 0]
    if not elapsed_values:
        return 0
    return round(sum(elapsed_values) / len(elapsed_values))


def _build_rate(value: int, total: int):
    """计算百分比"""
    if not total:
        return 0
    return round(value / total * 100, 1)


def _format_hour_key(timestamp: int):
    """格式化完整小时桶键"""
    return datetime.fromtimestamp(timestamp / 1000).strftime("%Y-%m-%d %H:00")


def _build_trend_buckets(hours: int):
    """构造趋势桶"""
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    bucket_map = {}
    for index in range(max(1, hours) - 1, -1, -1):
        bucket_time = now - timedelta(hours=index)
        # 桶键使用完整日期小时，避免跨年时 "月-日 时" 撞桶；label 仅用于前端简短显示
        bucket_map[bucket_time.strftime("%Y-%m-%d %H:00")] = {
            "label": bucket_time.strftime("%m-%d %H:00"),
            "search_count": 0,
            "error_count": 0,
            "elapsed_total": 0,
        }
    return bucket_map


def _extract_keyword(entry: dict):
    """提取搜索关键词"""
    url = str(entry.get("url") or "")
    if not url:
        return ""
    query = parse_qs(urlparse(url).query)
    for key in ["wd", "keyword", "searchword", "q"]:
        value = query.get(key)
        if value and value[0].strip():
            return value[0].strip()
    return ""
