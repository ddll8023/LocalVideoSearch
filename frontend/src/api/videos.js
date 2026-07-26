import request from '@/utils/request'

/**
 * 单站点视频搜索
 * @param {Object} params - 搜索参数，signal 用于取消请求
 * @returns {Promise} 搜索结果
 */
export function searchVideos({ wd, siteId, page = 1, pageSize = 20, signal }) {
  return request.get('/api/v1/videos/search', {
    params: {
      wd,
      site_id: siteId,
      page,
      page_size: pageSize
    },
    signal
  })
}

/**
 * 查询视频详情
 * @param {Object} params - 详情定位参数
 * @returns {Promise} 视频详情
 */
export function getVideoDetail({ keyword, siteId, vodId, page = 1 }) {
  return request.get('/api/v1/videos/detail', {
    params: {
      keyword,
      site_id: siteId,
      vod_id: vodId,
      page
    }
  })
}
