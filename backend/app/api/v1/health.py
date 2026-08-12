"""健康检查 API"""
from fastapi import APIRouter

from app.schemas import health as schemas_health
from app.schemas.response import ApiResponse, error, success
from app.services import health as services_health
from app.utils.exception import ServiceException


router = APIRouter(prefix="/health", tags=["health"])


@router.post("", response_model=ApiResponse[schemas_health.HealthResponse])
def query_health_status(_request: schemas_health.HealthRequest):
    """查询后端健康状态"""
    try:
        result = services_health.get_health_status()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
