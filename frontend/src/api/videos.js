import request from '@/utils/request'

export function searchVideos({ wd, siteId, page = 1, pageSize = 20 }) {
  return request.get('/api/v1/videos/search', {
    params: {
      wd,
      site_id: siteId,
      page,
      page_size: pageSize
    }
  })
}

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

