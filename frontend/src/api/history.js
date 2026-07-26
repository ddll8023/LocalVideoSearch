import request from '@/utils/request'

/**
 * 查询最近搜索历史
 * @param {number} limit - 返回条数
 * @returns {Promise} 搜索历史列表
 */
export function getSearchHistory(limit = 10) {
  return request.get('/api/v1/history', { params: { limit } })
}

/**
 * 记录搜索关键词
 * @param {string} keyword - 搜索关键词
 * @returns {Promise} 记录结果
 */
export function recordSearchHistory(keyword) {
  return request.post('/api/v1/history', { keyword })
}

/**
 * 删除单条搜索历史
 * @param {number} historyId - 历史记录 ID
 * @returns {Promise} 删除结果
 */
export function deleteSearchHistory(historyId) {
  return request.delete(`/api/v1/history/${historyId}`)
}

/**
 * 清空搜索历史
 * @returns {Promise} 清空结果
 */
export function clearSearchHistory() {
  return request.delete('/api/v1/history')
}
