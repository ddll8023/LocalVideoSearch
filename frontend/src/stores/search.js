import { computed, nextTick, ref } from 'vue'
import { defineStore } from 'pinia'

import { recordSearchHistory } from '@/api/history'
import { searchVideos } from '@/api/videos'
import { useResourceStore } from '@/stores/resources'

const CACHE_KEY = 'videosearch.search.state'
const CACHE_VERSION = 2
const CACHE_EXPIRE_MS = 2 * 60 * 60 * 1000
const DEFAULT_PAGE_SIZE = 20

const isCanceledError = (err) =>
  err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError'

export const useSearchStore = defineStore('search', () => {
  const keyword = ref('')
  const activeSiteId = ref('')
  const resultMap = ref({})
  const failureMap = ref({})
  // 各站点搜索状态：loading / success / failed
  const statusMap = ref({})
  const loading = ref(false)
  const error = ref('')
  const hasSearched = ref(false)

  let abortController = null
  let searchSeq = 0

  const resultSites = computed(() => Object.values(resultMap.value))
  const activeResult = computed(() => resultMap.value[activeSiteId.value] || null)
  const hasResults = computed(() => resultSites.value.some((result) => result.lists.length > 0))
  const failedResults = computed(() => Object.values(failureMap.value))
  const searchingCount = computed(
    () => Object.values(statusMap.value).filter((status) => status === 'loading').length
  )

  const setKeyword = (value) => {
    keyword.value = value
  }

  const setActiveSite = (siteId) => {
    activeSiteId.value = siteId
  }

  const restoreCache = () => {
    const rawCache = localStorage.getItem(CACHE_KEY)
    if (!rawCache) return

    try {
      const cache = JSON.parse(rawCache)
      if (cache.version !== CACHE_VERSION || Date.now() - cache.saved_at > CACHE_EXPIRE_MS) {
        localStorage.removeItem(CACHE_KEY)
        return
      }

      keyword.value = cache.keyword || ''
      activeSiteId.value = cache.active_site_id || ''
      resultMap.value = cache.result_map || {}
      failureMap.value = cache.failure_map || {}
      hasSearched.value = Boolean(cache.has_searched || Object.keys(resultMap.value).length)

      // 恢复时按结果重建站点状态
      const restoredStatus = {}
      Object.keys(resultMap.value).forEach((siteId) => {
        restoredStatus[siteId] = 'success'
      })
      Object.keys(failureMap.value).forEach((siteId) => {
        restoredStatus[siteId] = 'failed'
      })
      statusMap.value = restoredStatus
    } catch {
      localStorage.removeItem(CACHE_KEY)
    }
  }

  const saveCache = () => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          version: CACHE_VERSION,
          keyword: keyword.value,
          active_site_id: activeSiteId.value,
          result_map: resultMap.value,
          failure_map: failureMap.value,
          has_searched: hasSearched.value,
          saved_at: Date.now()
        })
      )
    } catch {
      // localStorage 空间不足时放弃本次缓存，不影响页面功能
      localStorage.removeItem(CACHE_KEY)
    }
  }

  const clearResults = () => {
    abortController?.abort()
    resultMap.value = {}
    failureMap.value = {}
    statusMap.value = {}
    activeSiteId.value = ''
    hasSearched.value = false
    localStorage.removeItem(CACHE_KEY)
  }

  const searchAcrossSites = async ({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
    const wd = keyword.value.trim()
    if (!wd) {
      error.value = '请输入关键词'
      return
    }

    // 取消上一次未完成的搜索，避免竞态
    abortController?.abort()
    abortController = new AbortController()
    const signal = abortController.signal
    const seq = ++searchSeq

    loading.value = true
    error.value = ''
    resultMap.value = {}
    failureMap.value = {}
    statusMap.value = {}
    activeSiteId.value = ''
    hasSearched.value = true

    try {
      const resourceStore = useResourceStore()
      if (resourceStore.sites.length === 0) {
        await resourceStore.fetchSites()
      }

      if (resourceStore.enabledSites.length === 0) {
        error.value = '暂无启用的资源站'
        saveCache()
        return
      }

      const sites = resourceStore.enabledSites

      const initialStatus = {}
      sites.forEach((site) => {
        initialStatus[site.site_id] = 'loading'
      })
      statusMap.value = initialStatus

      // 记录搜索历史，失败不影响搜索流程
      recordSearchHistory(wd).catch(() => {})

      const queue = []
      let wakeResolve = null
      const wake = () => {
        if (wakeResolve) {
          wakeResolve()
          wakeResolve = null
        }
      }
      const waitWake = () => new Promise((r) => { wakeResolve = r })
      const push = (item) => { queue.push(item); wake() }

      let settled = 0
      const total = sites.length

      sites.forEach((site) => {
        searchVideos({ wd, siteId: site.site_id, page, pageSize, signal })
          .then((response) => {
            push({ ok: true, site, data: response.data })
          })
          .catch((err) => {
            if (isCanceledError(err)) {
              push({ canceled: true, site })
            } else {
              push({ ok: false, site, message: err?.message || '搜索失败' })
            }
          })
          .finally(() => {
            settled++
            if (settled === total) push(null)
          })
      })

      while (true) {
        if (queue.length === 0) await waitWake()
        const item = queue.shift()
        if (item === null) break
        // 新搜索已启动，终止旧循环
        if (seq !== searchSeq) return

        if (item.canceled) {
          continue
        }

        if (item.ok) {
          resultMap.value = {
            ...resultMap.value,
            [item.site.site_id]: buildSiteResult(item.site, item.data, page, pageSize)
          }
          statusMap.value = { ...statusMap.value, [item.site.site_id]: 'success' }
          if (!activeSiteId.value) {
            activeSiteId.value = item.site.site_id
          }
        } else {
          failureMap.value = {
            ...failureMap.value,
            [item.site.site_id]: { site: item.site, message: item.message }
          }
          statusMap.value = { ...statusMap.value, [item.site.site_id]: 'failed' }
        }
        await nextTick()
      }

      if (!activeSiteId.value) {
        activeSiteId.value = Object.keys(resultMap.value)[0] || ''
      }
      saveCache()
    } catch (searchError) {
      if (isCanceledError(searchError)) return
      error.value = searchError.message
      throw searchError
    } finally {
      if (seq === searchSeq) {
        loading.value = false
      }
    }
  }

  const searchSitePage = async ({ siteId, page, pageSize = DEFAULT_PAGE_SIZE }) => {
    const wd = keyword.value.trim()
    if (!wd || !siteId) return

    loading.value = true
    error.value = ''
    try {
      const resourceStore = useResourceStore()
      if (resourceStore.sites.length === 0) {
        await resourceStore.fetchSites()
      }

      const site = resourceStore.sites.find((item) => item.site_id === siteId)
      if (!site) {
        error.value = '资源站不存在'
        return
      }

      const response = await searchVideos({
        wd,
        siteId,
        page,
        pageSize
      })

      resultMap.value = {
        ...resultMap.value,
        [siteId]: buildSiteResult(site, response.data, page, pageSize)
      }
      const nextFailureMap = { ...failureMap.value }
      delete nextFailureMap[siteId]
      failureMap.value = nextFailureMap
      statusMap.value = { ...statusMap.value, [siteId]: 'success' }
      activeSiteId.value = siteId
      saveCache()
    } catch (searchError) {
      if (isCanceledError(searchError)) return
      error.value = searchError.message
      throw searchError
    } finally {
      loading.value = false
    }
  }

  const retrySite = async (siteId) => {
    const wd = keyword.value.trim()
    if (!wd || !siteId) return

    const resourceStore = useResourceStore()
    const site = resourceStore.sites.find((item) => item.site_id === siteId)
    if (!site) return

    statusMap.value = { ...statusMap.value, [siteId]: 'loading' }
    try {
      const response = await searchVideos({
        wd,
        siteId,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE
      })

      resultMap.value = {
        ...resultMap.value,
        [siteId]: buildSiteResult(site, response.data, 1, DEFAULT_PAGE_SIZE)
      }
      const nextFailureMap = { ...failureMap.value }
      delete nextFailureMap[siteId]
      failureMap.value = nextFailureMap
      statusMap.value = { ...statusMap.value, [siteId]: 'success' }
      if (!activeSiteId.value) {
        activeSiteId.value = siteId
      }
      saveCache()
    } catch (err) {
      if (isCanceledError(err)) return
      failureMap.value = {
        ...failureMap.value,
        [siteId]: { site, message: err?.message || '搜索失败' }
      }
      statusMap.value = { ...statusMap.value, [siteId]: 'failed' }
    }
  }

  return {
    keyword,
    activeSiteId,
    resultMap,
    failureMap,
    statusMap,
    resultSites,
    activeResult,
    hasResults,
    failedResults,
    searchingCount,
    loading,
    error,
    hasSearched,
    setKeyword,
    setActiveSite,
    restoreCache,
    saveCache,
    clearResults,
    searchAcrossSites,
    searchSitePage,
    retrySite
  }
})

function buildSiteResult(site, payload, page, pageSize) {
  return {
    site: {
      ...site,
      site_id: payload?.site_id || site.site_id,
      name: payload?.site_name || site.name
    },
    lists: payload?.lists || [],
    pagination: payload?.pagination || {
      page,
      page_size: pageSize,
      total: 0,
      total_pages: 0
    },
    filterStats: payload?.filter_stats || null,
    elapsedMs: payload?.elapsed_ms || 0
  }
}
