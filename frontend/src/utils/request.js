import axios from 'axios'

const DEFAULT_BASE_URL = 'http://127.0.0.1:8765'

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
    const { data, status } = response
    if (status >= 200 && status < 300 && data.code === 0) {
      return data
    }
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  (requestError) => {
    const message = requestError.response?.data?.message || requestError.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

export default request

