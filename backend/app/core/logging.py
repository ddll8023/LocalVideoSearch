"""日志配置工具"""
import logging

from app.core.config import settings


def setup_logging():
    """初始化日志输出"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        handlers=[
            logging.FileHandler(settings.LOG_FILE_PATH, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )

