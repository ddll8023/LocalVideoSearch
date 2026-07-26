import request from '@/utils/request'

/**
 * 分页查询收藏列表
 * @param {Object} params - 分页参数
 * @returns {Promise} 收藏列表
 */
export function getFavorites({ page = 1, pageSize = 20 } = {}) {
  return request.get('/api/v1/favorites', {
    params: { page, page_size: pageSize }
  })
}

/**
 * 查询视频收藏状态
 * @param {Object} params - 站点与视频标识
 * @returns {Promise} 收藏状态
 */
export function getFavoriteStatus({ siteId, vodId }) {
  return request.get('/api/v1/favorites/status', {
    params: { site_id: siteId, vod_id: vodId }
  })
}

/**
 * 添加收藏
 * @param {Object} video - 视频信息
 * @returns {Promise} 收藏结果
 */
export function addFavorite({ siteId, vodId, title, thumbnail, typeName, remarks, keyword }) {
  return request.post('/api/v1/favorites', {
    site_id: siteId,
    vod_id: vodId,
    title,
    thumbnail: thumbnail || '',
    type_name: typeName || '',
    remarks: remarks || '',
    keyword
  })
}

/**
 * 取消收藏
 * @param {number} favoriteId - 收藏 ID
 * @returns {Promise} 取消结果
 */
export function removeFavorite(favoriteId) {
  return request.delete(`/api/v1/favorites/${favoriteId}`)
}
