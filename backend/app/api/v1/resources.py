"""资源站 API"""
from fastapi import APIRouter

from app.schemas import resources as schemas_resources
from app.schemas.response import ApiResponse, error, success
from app.services import resources as services_resources
from app.utils.exception import ServiceException


router = APIRouter(prefix="/resources", tags=["resources"])


@router.post(
    "/sites/list",
    response_model=ApiResponse[schemas_resources.ResourceSiteListResponse],
)
def query_resource_site_list(_request: schemas_resources.ResourceSiteListRequest):
    """查询资源站列表"""
    try:
        result = services_resources.get_site_list()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites/detail",
    response_model=ApiResponse[schemas_resources.ResourceSiteResponse],
)
def query_resource_site_detail(data: schemas_resources.ResourceSiteDetailRequest):
    """查询资源站详情"""
    try:
        result = services_resources.get_site_detail(data.site_id)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites/toggle",
    response_model=ApiResponse[schemas_resources.ResourceSiteToggleResponse],
)
def toggle_resource_site(data: schemas_resources.ResourceSiteToggleRequest):
    """切换资源站启用状态"""
    try:
        result = services_resources.toggle_site_enabled(data.site_id)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites/test",
    response_model=ApiResponse[schemas_resources.ResourceSiteTestResponse],
)
async def test_resource_site(data: schemas_resources.ResourceSiteTestRequest):
    """测试资源站连接"""
    try:
        result = await services_resources.test_site_connection(data.site_id)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites",
    response_model=ApiResponse[schemas_resources.ResourceSiteResponse],
)
def create_resource_site(data: schemas_resources.ResourceSiteCreateRequest):
    """新增资源站"""
    try:
        result = services_resources.create_site(data)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites/update",
    response_model=ApiResponse[schemas_resources.ResourceSiteResponse],
)
def update_resource_site(data: schemas_resources.ResourceSiteUpdateActionRequest):
    """更新资源站配置"""
    try:
        update_data = schemas_resources.ResourceSiteUpdateRequest.model_validate(
            data.model_dump(exclude={"site_id"}, exclude_unset=True)
        )
        result = services_resources.update_site(data.site_id, update_data)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites/delete",
    response_model=ApiResponse[schemas_resources.ResourceSiteDeleteResponse],
)
def delete_resource_site(data: schemas_resources.ResourceSiteDeleteRequest):
    """删除资源站"""
    try:
        result = services_resources.delete_site(data.site_id)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/sites/test-all",
    response_model=ApiResponse[schemas_resources.ResourceSiteBatchTestResponse],
)
async def test_all_resource_sites(
    _request: schemas_resources.ResourceSiteBatchTestRequest,
):
    """批量测试所有已启用资源站"""
    try:
        result = await services_resources.test_enabled_sites()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/config/export",
    response_model=ApiResponse[schemas_resources.ResourceConfigExportResponse],
)
def export_resource_config(_request: schemas_resources.ResourceConfigExportRequest):
    """导出资源站配置"""
    try:
        result = services_resources.export_config()
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)


@router.post(
    "/config/import",
    response_model=ApiResponse[schemas_resources.ResourceConfigImportResponse],
)
def import_resource_config(data: schemas_resources.ResourceConfigImportRequest):
    """导入资源站配置"""
    try:
        result = services_resources.import_config(data)
        return success(data=result)
    except ServiceException as exc:
        return error(code=exc.code, message=exc.message)
