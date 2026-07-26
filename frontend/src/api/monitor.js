import request from '@/utils/request'

export function getDashboardOverview() {
  return request.get('/api/v1/monitor/dashboard')
}

export function getSearchStats({ hours = 24 } = {}) {
  return request.get('/api/v1/monitor/search-stats', {
    params: { hours }
  })
}

export function getSystemHealth({ hours = 24 } = {}) {
  return request.get('/api/v1/monitor/system-health', {
    params: { hours }
  })
}

export function getRealTimeSummary() {
  return request.get('/api/v1/monitor/real-time')
}

export function getSitePerformance({ hours = 24 } = {}) {
  return request.get('/api/v1/monitor/site-performance', {
    params: { hours }
  })
}

export function getTrends({ hours = 24 } = {}) {
  return request.get('/api/v1/monitor/trends', {
    params: { hours }
  })
}

export function getHotKeywords({ hours = 24, limit = 10 } = {}) {
  return request.get('/api/v1/monitor/hot-keywords', {
    params: {
      hours,
      limit
    }
  })
}

