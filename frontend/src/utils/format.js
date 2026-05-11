export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) {
    return '-'
  }
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`
  }
  return `${(milliseconds / 1000).toFixed(2)}s`
}

export function formatCount(value) {
  if (!Number.isFinite(value)) {
    return '0'
  }
  return new Intl.NumberFormat('zh-CN').format(value)
}

