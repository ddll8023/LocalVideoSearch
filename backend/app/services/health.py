"""健康检查服务"""
from app.core.config import settings
from app.schemas import health as schemas_health


def get_health_status():
    """获取后端健康状态"""
    return schemas_health.HealthResponse(
        app_name=settings.APP_NAME,
        app_env=settings.APP_ENV,
        api_host=settings.API_HOST,
        api_port=settings.API_PORT,
        status="ok",
    )

