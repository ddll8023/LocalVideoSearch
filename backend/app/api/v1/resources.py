"""资源站 API"""
from fastapi import APIRouter

from app.schemas import resources as schemas_resources
from app.schemas.response import ApiResponse, error, success
from app.services import resources as services_resources
from app.utils.exception import ServiceException


router = APIRouter(prefix="/resources", tags=["resources"])


@router.get(
    "/sites",
    response_model=ApiResponse[schemas_resources.ResourceSiteListResponse],
)
def query_resource_site_list():
    """查询资源站列表"""
    try:
        result = services_resources.get_site_list()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.get(
    "/sites/{site_id}",
    response_model=ApiResponse[schemas_resources.ResourceSiteResponse],
)
def query_resource_site_detail(site_id: str):
    """查询资源站详情"""
    try:
        result = services_resources.get_site_detail(site_id)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites/{site_id}/toggle",
    response_model=ApiResponse[schemas_resources.ResourceSiteToggleResponse],
)
def toggle_resource_site(site_id: str):
    """切换资源站启用状态"""
    try:
        result = services_resources.toggle_site_enabled(site_id)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites/{site_id}/test",
    response_model=ApiResponse[schemas_resources.ResourceSiteTestResponse],
)
async def test_resource_site(site_id: str):
    """测试资源站连接"""
    try:
        result = await services_resources.test_site_connection(site_id)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
