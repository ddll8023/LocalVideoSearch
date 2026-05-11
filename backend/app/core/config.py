"""应用配置入口"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """应用统一配置"""

    APP_NAME: str = "VideoSearch"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8765
    APP_DATA_DIR: Path = Path.home() / "AppData" / "Roaming" / "VideoSearch"
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    CONNECTION_TEST_KEYWORDS: list[str] = ["喜羊羊", "灰太狼", "猪猪侠"]
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


settings = Settings()
