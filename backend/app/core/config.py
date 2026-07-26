"""应用配置入口"""
import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

if getattr(sys, "frozen", False):
    PROJECT_ROOT = Path(sys.executable).resolve().parent.parent
else:
    PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _default_app_data_dir() -> Path:
    """按平台惯例返回应用数据目录"""
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "VideoSearch"
    if sys.platform == "win32":
        return Path.home() / "AppData" / "Roaming" / "VideoSearch"
    return Path.home() / ".local" / "share" / "VideoSearch"


class Settings(BaseSettings):
    """应用统一配置"""

    APP_NAME: str = "VideoSearch"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 4740
    APP_DATA_DIR: Path = _default_app_data_dir()
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    CONNECTION_TEST_KEYWORD: str = "喜羊羊"
    CONNECTION_TEST_CONCURRENCY: int = 5
    CONNECTION_MIN_RESPONSE_SIZE: int = 100
    CONNECTION_INVALID_INDICATORS: list[str] = [
        "verify",
        "captcha",
        "验证",
        "人机验证",
        "Request ID",
    ]
    CONNECTION_VALID_RESPONSE_CODES: list[int] = [0, 1, 200]
    CONNECTION_TIMEOUT: int = 15
    LOG_MAX_BYTES: int = 10 * 1024 * 1024
    LOG_BACKUP_COUNT: int = 5

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def DEFAULT_RESOURCE_CONFIG_PATH(self) -> Path:
        """默认资源站配置文件路径"""
        return PROJECT_ROOT / "resources" / "resource_sites.json"

    @property
    def RESOURCE_CONFIG_PATH(self) -> Path:
        """资源站配置文件路径"""
        return self.APP_DATA_DIR / "resource_sites.json"

    @property
    def LOG_FILE_PATH(self) -> Path:
        """系统日志文件路径"""
        return self.APP_DATA_DIR / "logs" / "video_search.log"

    @property
    def DATABASE_PATH(self) -> Path:
        """SQLite 数据库文件路径"""
        return self.APP_DATA_DIR / "video_search.db"


settings = Settings()
