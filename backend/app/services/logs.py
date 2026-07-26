"""日志查询统计服务"""
from datetime import datetime, timedelta
import csv
import io
import json
import logging
import math
from pathlib import Path

from app.core.config import settings
from app.schemas import logs as schemas_logs
from app.schemas.response import ErrorCode, PaginatedResponse, PaginationInfo
from app.utils.exception import ServiceException


logger = logging.getLogger(__name__)


def query_log_list(query: schemas_logs.LogListRequest):
    """查询日志列表"""
    records = _read_log_records()
    filtered_entries = _filter_log_records(
        records,
        log_type=query.log_type,
        level=query.level,
        start_time=query.start_time,
        end_time=query.end_time,
        keyword=query.keyword,
    )
    total = len(filtered_entries)
    start_index = (query.page - 1) * query.page_size
    end_index = start_index + query.page_size
    page_entries = filtered_entries[start_index:end_index]

    return PaginatedResponse(
        lists=[
            schemas_logs.LogItemResponse.model_validate(entry)
            for entry in page_entries
        ],
        pagination=PaginationInfo(
            page=query.page,
            page_size=query.page_size,
            total=total,
            total_pages=math.ceil(total / query.page_size) if total else 0,
        ),
    )


def get_log_stats():
    """获取日志统计"""
    entries = read_log_entries()
    levels = _count_by_key(entries, "level")
    types = _count_by_key(entries, "log_type")
    latest_entry = entries[0] if entries else {}
    # 单次全量读取后在内存中同时统计 24 小时内错误数，避免重复读文件
    recent_min_timestamp = _get_min_timestamp(24) or 0
    recent_error_count = len(
        [
            entry
            for entry in entries
            if entry.get("level") == "ERROR"
            and int(entry.get("timestamp") or 0) >= recent_min_timestamp
        ]
    )

    return schemas_logs.LogStatsResponse(
        total=len(entries),
        info_count=levels.get("INFO", 0),
        warning_count=levels.get("WARNING", 0),
        error_count=levels.get("ERROR", 0),
        system_count=types.get("system", 0),
        request_count=types.get("request", 0),
        operation_count=types.get("operation", 0),
        recent_error_count=recent_error_count,
        latest_time=str(latest_entry.get("time") or ""),
        levels=levels,
        types=types,
    )


def export_logs(query: schemas_logs.LogExportRequest):
    """导出日志文件"""
    export_format = (query.export_format or "json").strip().lower()
    if export_format not in ("json", "csv"):
        raise ServiceException(ErrorCode.PARAM_ERROR, "导出格式不支持")

    records = _read_log_records()
    entries = _filter_log_records(
        records,
        log_type=query.log_type,
        level=query.level,
        start_time=query.start_time,
        end_time=query.end_time,
        keyword=query.keyword,
    )
    filename = f"logs_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{export_format}"
    if export_format == "json":
        content = json.dumps(entries, ensure_ascii=False, indent=2)
        media_type = "application/json"
    else:
        content = _build_csv_content(entries)
        media_type = "text/csv"

    logger.info(f"日志导出完成: format={export_format} count={len(entries)}")
    return filename, content, media_type


def clear_logs(request: schemas_logs.ClearLogsRequest):
    """清理日志文件"""
    entries = read_log_entries()
    try:
        settings.LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        settings.LOG_FILE_PATH.write_text("", encoding="utf-8")
        if request.include_backups:
            for log_path in _get_backup_log_paths():
                log_path.unlink(missing_ok=True)
    except OSError as exc:
        logger.error(f"日志清理失败: error={exc}", exc_info=True)
        raise ServiceException(ErrorCode.INTERNAL_ERROR, "日志清理失败") from exc

    return schemas_logs.ClearLogsResponse(
        cleared_count=len(entries),
        message="日志已清理",
    )


def read_log_entries(hours_back: int | None = None):
    """读取日志记录"""
    return [entry for entry, _ in _read_log_records(hours_back)]


"""辅助函数"""


def _read_log_records(hours_back: int | None = None):
    """读取日志记录及原始行文本"""
    try:
        records = []
        min_timestamp = _get_min_timestamp(hours_back)
        for log_path in _get_log_paths():
            records.extend(_read_log_file(log_path, min_timestamp))
        records.sort(key=lambda item: int(item[0].get("timestamp") or 0), reverse=True)
        return records
    except OSError as exc:
        logger.error(f"日志读取失败: error={exc}", exc_info=True)
        raise ServiceException(ErrorCode.INTERNAL_ERROR, "日志读取失败") from exc


def _filter_log_records(
    records: list[tuple[dict, str]],
    log_type: str | None,
    level: str | None,
    start_time: str | None,
    end_time: str | None,
    keyword: str | None,
):
    """过滤日志记录"""
    start_timestamp = _parse_time_to_timestamp(start_time)
    end_timestamp = _parse_time_to_timestamp(end_time)
    keyword_lower = (keyword or "").strip().lower()
    log_type_text = (log_type or "").strip()
    level_text = (level or "").strip().upper()

    filtered_entries = []
    for entry, raw_line_lower in records:
        entry_timestamp = int(entry.get("timestamp") or 0)
        if log_type_text and entry.get("log_type") != log_type_text:
            continue
        if level_text and str(entry.get("level") or "").upper() != level_text:
            continue
        if start_timestamp and entry_timestamp < start_timestamp:
            continue
        if end_timestamp and entry_timestamp > end_timestamp:
            continue
        # 关键词直接匹配原始行小写文本，避免逐条 json.dumps 的序列化开销
        if keyword_lower and keyword_lower not in raw_line_lower:
            continue
        filtered_entries.append(entry)

    return filtered_entries


def _get_min_timestamp(hours_back: int | None):
    """获取最小时间戳"""
    if not hours_back:
        return None
    return int((datetime.now() - timedelta(hours=hours_back)).timestamp() * 1000)


def _get_log_paths():
    """获取日志文件路径"""
    paths = [settings.LOG_FILE_PATH]
    paths.extend(_get_backup_log_paths())
    return [path for path in paths if path.exists()]


def _get_backup_log_paths():
    """获取轮转日志路径"""
    backup_paths = []
    for index in range(1, settings.LOG_BACKUP_COUNT + 1):
        backup_paths.append(Path(f"{settings.LOG_FILE_PATH}.{index}"))
    return backup_paths


def _read_log_file(log_path: Path, min_timestamp: int | None):
    """读取单个日志文件"""
    records = []
    with log_path.open("r", encoding="utf-8") as file_obj:
        for line in file_obj:
            entry = _parse_log_line(line)
            if not entry:
                continue
            timestamp = int(entry.get("timestamp") or 0)
            if min_timestamp and timestamp < min_timestamp:
                continue
            records.append((entry, line.strip().lower()))
    return records


def _parse_log_line(line: str):
    """解析单行日志"""
    line = line.strip()
    if not line:
        return None
    try:
        entry = json.loads(line)
    except json.JSONDecodeError:
        return None
    if not isinstance(entry, dict):
        return None
    entry["timestamp"] = int(
        entry.get("timestamp") or _parse_time_to_timestamp(entry.get("time")) or 0
    )
    entry.setdefault("id", f"log-{entry['timestamp']}")
    entry.setdefault("time", "")
    entry.setdefault("level", "")
    entry.setdefault("log_type", "system")
    entry.setdefault("logger_name", "")
    entry.setdefault("message", "")
    return entry


def _parse_time_to_timestamp(time_text: str | None):
    """解析时间文本为毫秒时间戳"""
    if not time_text:
        return None
    normalized_text = time_text.strip()
    if not normalized_text:
        return None
    if normalized_text.isdigit():
        return int(normalized_text)
    try:
        if normalized_text.endswith("Z"):
            normalized_text = normalized_text[:-1]
        return int(datetime.fromisoformat(normalized_text).timestamp() * 1000)
    except ValueError:
        return None


def _count_by_key(entries: list[dict], key: str):
    """按字段统计数量"""
    counts = {}
    for entry in entries:
        value = str(entry.get(key) or "")
        if not value:
            continue
        counts[value] = counts.get(value, 0) + 1
    return counts


def _build_csv_content(entries: list[dict]):
    """构建 CSV 导出内容"""
    core_fields = ["timestamp", "time", "log_type", "level", "logger_name", "message"]
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([*core_fields, "extra"])
    for entry in entries:
        extra = {key: value for key, value in entry.items() if key not in core_fields}
        writer.writerow(
            [
                *(entry.get(field, "") for field in core_fields),
                json.dumps(extra, ensure_ascii=False),
            ]
        )
    return buffer.getvalue()
