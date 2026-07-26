import axios from 'axios'

const DEFAULT_BASE_URL = 'http://127.0.0.1:4740'

/**
 * 统一 API 错误对象
 * 保留业务错误码、HTTP 状态码、超时/网络错误标记，供页面按类型分流处理
 */
export class ApiError extends Error {
  constructor(message, { code = null, status = null, isTimeout = false, isNetwork = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.isTimeout = isTimeout
    this.isNetwork = isNetwork
  }
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

async function resolveBaseUrl() {
  if (typeof window !== 'undefined' && window.desktopApi?.getBackendBaseUrl) {
    return window.desktopApi.getBackendBaseUrl()
  }
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL
}

request.interceptors.request.use(
  async (config) => {
    config.baseURL = await resolveBaseUrl()
    return config
  },
  (requestError) => Promise.reject(requestError)
)

request.interceptors.response.use(
  (response) => {
    // 文件下载（blob）响应不做统一解包
    if (response.config.responseType === 'blob') {
      return response
    }

    const { data, status } = response
    if (status >= 200 && status < 300 && data.code === 0) {
      return data
    }
    return Promise.reject(
      new ApiError(data.message || '请求失败', { code: data.code ?? null, status })
    )
  },
  (requestError) => {
    // 请求被主动取消时原样抛出，由调用方忽略
    if (axios.isCancel(requestError)) {
      return Promise.reject(requestError)
    }

    if (requestError.code === 'ECONNABORTED' || /timeout/i.test(requestError.message || '')) {
      return Promise.reject(new ApiError('请求超时，请稍后重试', { isTimeout: true }))
    }

    if (requestError.response) {
      const { status, data } = requestError.response
      return Promise.reject(
        new ApiError(data?.message || '请求失败', { code: data?.code ?? null, status })
      )
    }

    return Promise.reject(new ApiError('网络连接失败，请检查后端服务', { isNetwork: true }))
  }
)

export default request
