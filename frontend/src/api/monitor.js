import request from '@/utils/request'

export function getDashboardOverview() {
  return request.post('/api/v1/monitor/dashboard', {})
}

export function getSearchStats({ hours = 24 } = {}) {
  return request.post('/api/v1/monitor/search-stats', { hours })
}

export function getSystemHealth({ hours = 24 } = {}) {
  return request.post('/api/v1/monitor/system-health', { hours })
}

export function getRealTimeSummary() {
  return request.post('/api/v1/monitor/real-time', {})
}

export function getSitePerformance({ hours = 24 } = {}) {
  return request.post('/api/v1/monitor/site-performance', { hours })
}

export function getTrends({ hours = 24 } = {}) {
  return request.post('/api/v1/monitor/trends', { hours })
}

export function getHotKeywords({ hours = 24, limit = 10 } = {}) {
  return request.post('/api/v1/monitor/hot-keywords', {
    hours,
    limit
  })
}
