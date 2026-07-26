import request from '@/utils/request'

/**
 * 分页查询播放记录列表
 * @param {Object} params - 分页参数
 * @returns {Promise} 播放记录列表
 */
export function getPlayRecords({ page = 1, pageSize = 20 } = {}) {
  return request.get('/api/v1/play-records', {
    params: { page, page_size: pageSize }
  })
}

/**
 * 查询单个视频的播放记录
 * @param {Object} params - 站点与视频标识
 * @returns {Promise} 播放记录，不存在时 data 为 null
 */
export function getPlayRecordDetail({ siteId, vodId }) {
  return request.get('/api/v1/play-records/detail', {
    params: { site_id: siteId, vod_id: vodId }
  })
}

/**
 * 写入播放记录（同一视频自动更新）
 * @param {Object} record - 播放记录内容
 * @returns {Promise} 写入结果
 */
export function upsertPlayRecord({
  siteId,
  vodId,
  title,
  thumbnail,
  keyword,
  lineName,
  episodeIndex,
  episodeName,
  positionSeconds,
  durationSeconds
}) {
  return request.put('/api/v1/play-records', {
    site_id: siteId,
    vod_id: vodId,
    title,
    thumbnail: thumbnail || '',
    keyword,
    line_name: lineName || '',
    episode_index: episodeIndex || 0,
    episode_name: episodeName || '',
    position_seconds: Math.floor(positionSeconds || 0),
    duration_seconds: Math.floor(durationSeconds || 0)
  })
}

/**
 * 删除单条播放记录
 * @param {number} recordId - 播放记录 ID
 * @returns {Promise} 删除结果
 */
export function deletePlayRecord(recordId) {
  return request.delete(`/api/v1/play-records/${recordId}`)
}

/**
 * 清空播放记录
 * @returns {Promise} 清空结果
 */
export function clearPlayRecords() {
  return request.delete('/api/v1/play-records')
}
