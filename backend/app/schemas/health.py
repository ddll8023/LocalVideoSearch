"""健康检查响应模型"""
from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    """健康检查响应"""

    app_name: str
    app_env: str
    api_host: str
    api_port: int
    status: str

    model_config = ConfigDict(from_attributes=True)

