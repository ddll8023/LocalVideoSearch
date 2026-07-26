import request from '@/utils/request'

export function getResourceSites() {
  return request.get('/api/v1/resources/sites')
}

export function getResourceSiteDetail(siteId) {
  return request.get(`/api/v1/resources/sites/${siteId}`)
}

export function toggleResourceSite(siteId) {
  return request.post(`/api/v1/resources/sites/${siteId}/toggle`)
}

export function testResourceSite(siteId) {
  return request.post(`/api/v1/resources/sites/${siteId}/test`)
}

/**
 * 创建资源站
 * @param {Object} siteData - 站点数据（snake_case：site_id/name/base_url/enabled/timeout/search_endpoint/page_param/action_param）
 * @returns {Promise} 新建站点
 */
export function createResourceSite(siteData) {
  return request.post('/api/v1/resources/sites', siteData)
}

/**
 * 更新资源站
 * @param {string} siteId - 站点 ID
 * @param {Object} siteData - 待更新字段的可选子集（snake_case，site_id 不可改）
 * @returns {Promise} 更新后站点
 */
export function updateResourceSite(siteId, siteData) {
  return request.put(`/api/v1/resources/sites/${siteId}`, siteData)
}

/**
 * 删除资源站
 * @param {string} siteId - 站点 ID
 * @returns {Promise} 删除结果
 */
export function deleteResourceSite(siteId) {
  return request.delete(`/api/v1/resources/sites/${siteId}`)
}

/**
 * 批量测试全部已启用资源站
 * @returns {Promise} 批量测试结果（total/success_count/failed_count/results）
 */
export function testAllResourceSites() {
  return request.post('/api/v1/resources/sites/test-all')
}

/**
 * 导出资源站配置
 * @returns {Promise} 配置数据（sites 数组）
 */
export function exportResourceConfig() {
  return request.get('/api/v1/resources/config/export')
}

/**
 * 导入资源站配置
 * @param {Array} sites - 站点配置数组（snake_case 字段）
 * @returns {Promise} 导入结果（imported_count/message）
 */
export function importResourceConfig(sites) {
  return request.post('/api/v1/resources/config/import', { sites })
}

