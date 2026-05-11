"""日志配置工具"""
from datetime import datetime
import json
import logging
import logging.handlers
from urllib.parse import urlencode
import uuid

from app.core.config import settings


class JsonLineFormatter(logging.Formatter):
    """JSON Lines 日志格式化器"""

    def format(self, record: logging.LogRecord) -> str:
        """格式化日志记录"""
        log_entry = {
            "id": f"{str(uuid.uuid4())[:8]}-{int(record.created * 1000) % 100000}",
            "time": datetime.fromtimestamp(record.created).strftime(
                "%Y-%m-%dT%H:%M:%S.%f"
            )[:-3]
            + "Z",
            "timestamp": int(record.created * 1000),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger_name": record.name,
            "log_type": self._get_log_type(record),
        }

        if hasattr(record, "site_name"):
            log_entry["site"] = record.site_name
        if hasattr(record, "status_code"):
            log_entry["status"] = record.status_code

        for key in [
            "request_id",
            "elapsed_ms",
            "data_count",
            "error",
            "url",
            "component",
            "operation_type",
            "description",
            "client_ip",
            "user_agent",
        ]:
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False)

    def _get_log_type(self, record: logging.LogRecord) -> str:
        """获取日志类型"""
        if "video_search.requests" in record.name:
            return "request"
        if hasattr(record, "operation_type"):
            return "operation"
        return "system"


class RequestLogger:
    """HTTP 请求日志记录器"""

    def __init__(self, site_name: str = ""):
        self.logger = logging.getLogger("video_search.requests")
        self.site_name = site_name

    def log_request_start(self, url: str, params: dict, request_id: str | None = None):
        """记录请求开始"""
        request_id = request_id or str(uuid.uuid4())[:8]
        full_url = url
        if params:
            full_url = f"{url}?{urlencode(params)}"

        self.logger.info(
            f"请求 {self.site_name}",
            extra={
                "request_id": request_id,
                "site_name": self.site_name,
                "url": full_url,
            },
        )
        return request_id

    def log_request_success(
        self,
        request_id: str,
        status_code: int,
        elapsed_ms: int,
        data_count: int = 0,
    ):
        """记录请求成功"""
        self.logger.info(
            f"{self.site_name} 请求成功",
            extra={
                "request_id": request_id,
                "site_name": self.site_name,
                "status_code": status_code,
                "elapsed_ms": elapsed_ms,
                "data_count": data_count,
            },
        )

    def log_request_error(
        self,
        request_id: str,
        error_message: str,
        elapsed_ms: int,
        status_code: int | None = None,
    ):
        """记录请求失败"""
        self.logger.error(
            f"{self.site_name} 请求失败",
            extra={
                "request_id": request_id,
                "site_name": self.site_name,
                "status_code": status_code,
                "elapsed_ms": elapsed_ms,
                "error": error_message,
            },
        )

    def log_request_timeout(self, request_id: str, timeout: int, elapsed_ms: int):
        """记录请求超时"""
        self.logger.warning(
            f"{self.site_name} 请求超时",
            extra={
                "request_id": request_id,
                "site_name": self.site_name,
                "elapsed_ms": elapsed_ms,
                "error": f"timeout({timeout}s)",
            },
        )


def setup_logging():
    """初始化日志输出"""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        handler.close()

    settings.LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)

    file_handler = logging.handlers.RotatingFileHandler(
        settings.LOG_FILE_PATH,
        maxBytes=settings.LOG_MAX_BYTES,
        backupCount=settings.LOG_BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(JsonLineFormatter())
    root_logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    root_logger.addHandler(console_handler)

    logging.getLogger("httpx").setLevel(logging.WARNING)
