import request from '@/utils/request'

export function querySystemLogs({
  page = 1,
  pageSize = 20,
  logType,
  level,
  startTime,
  endTime,
  keyword
} = {}) {
  return request.get('/api/v1/logs/system', {
    params: {
      page,
      page_size: pageSize,
      log_type: logType,
      level,
      start_time: startTime,
      end_time: endTime,
      keyword
    }
  })
}

export function getLogStats() {
  return request.get('/api/v1/logs/stats')
}

export function exportLogs({
  logType,
  level,
  startTime,
  endTime,
  keyword,
  exportFormat = 'json'
} = {}) {
  return request.get('/api/v1/logs/export', {
    params: {
      log_type: logType,
      level,
      start_time: startTime,
      end_time: endTime,
      keyword,
      export_format: exportFormat
    },
    responseType: 'blob'
  })
}

export function clearLogs({ includeBackups = true } = {}) {
  return request.post('/api/v1/logs/clear', {
    include_backups: includeBackups
  })
}
