import { computed, nextTick, ref } from 'vue'
import { defineStore } from 'pinia'

import { recordSearchHistory } from '@/api/history'
import { searchVideos } from '@/api/videos'
import { useResourceStore } from '@/stores/resources'

const CACHE_KEY = 'videosearch.search.state'
const CACHE_VERSION = 3
const CACHE_EXPIRE_MS = 3 * 24 * 60 * 60 * 1000
const MAX_CACHED_RESULTS = 32
const DEFAULT_PAGE_SIZE = 20

const isCanceledError = (err) =>
  err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError'

const normalizeKeyword = (value) => String(value || '').trim().toLocaleLowerCase()

const buildCacheKey = ({ keyword, siteId, page, pageSize }) =>
  JSON.stringify([normalizeKeyword(keyword), String(siteId), Number(page), Number(pageSize)])

const isCacheFresh = (savedAt) => {
  const timestamp = Number(savedAt)
  return Number.isFinite(timestamp) && Date.now() - timestamp <= CACHE_EXPIRE_MS
}

const removePersistentCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // 缓存不可用时不影响搜索主流程。
  }
}

const readPersistentCache = () => {
  try {
    const rawCache = localStorage.getItem(CACHE_KEY)
    if (!rawCache) return { version: CACHE_VERSION, entries: [], recent_state: null }

    const cache = JSON.parse(rawCache)
    if (cache.version !== CACHE_VERSION) {
      removePersistentCache()
      return { version: CACHE_VERSION, entries: [], recent_state: null }
    }

    const rawEntries = Array.isArray(cache.entries) ? cache.entries : []
    const entries = rawEntries.filter(
      (entry) =>
        entry?.key &&
        entry?.result &&
        isCacheFresh(entry.saved_at)
    )
    const recentState =
      cache.recent_state && isCacheFresh(cache.recent_state.saved_at)
        ? cache.recent_state
        : null

    if (entries.length !== rawEntries.length || (cache.recent_state && !recentState)) {
      writePersistentCache({
        ...cache,
        version: CACHE_VERSION,
        entries,
        recent_state: recentState
      })
    }

    return {
      version: CACHE_VERSION,
      entries,
      recent_state: recentState
    }
  } catch {
    removePersistentCache()
    return { version: CACHE_VERSION, entries: [], recent_state: null }
  }
}

function writePersistentCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage 空间不足或被禁用时放弃缓存，不影响页面功能。
    removePersistentCache()
  }
}

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
    const cache = readPersistentCache()
    const recentState = cache.recent_state
    if (!recentState) return

    keyword.value = recentState.keyword || ''
    const validKeys = new Set(cache.entries.map((entry) => entry.key))
    const cachedResultMap =
      recentState.result_map && typeof recentState.result_map === 'object'
        ? recentState.result_map
        : {}
    resultMap.value = Object.fromEntries(
      Object.entries(cachedResultMap).filter(([siteId, result]) => {
        const page = Number(result?.pagination?.page || 1)
        const pageSize = Number(result?.pagination?.page_size || DEFAULT_PAGE_SIZE)
        return validKeys.has(
          buildCacheKey({
            keyword: recentState.keyword,
            siteId,
            page,
            pageSize
          })
        )
      })
    )
    activeSiteId.value = resultMap.value[recentState.active_site_id]
      ? recentState.active_site_id
      : Object.keys(resultMap.value)[0] || ''
    // 失败响应不进入缓存，恢复时只重建成功状态。
    failureMap.value = {}
    hasSearched.value = Boolean(
      recentState.has_searched || Object.keys(resultMap.value).length
    )

    const restoredStatus = {}
    Object.keys(resultMap.value).forEach((siteId) => {
      restoredStatus[siteId] = 'success'
    })
    statusMap.value = restoredStatus
  }

  const saveCache = () => {
    const cache = readPersistentCache()
    const now = Date.now()
    let entries = cache.entries

    Object.entries(resultMap.value).forEach(([siteId, result]) => {
      const page = Number(result?.pagination?.page || 1)
      const pageSize = Number(result?.pagination?.page_size || DEFAULT_PAGE_SIZE)
      const key = buildCacheKey({
        keyword: keyword.value,
        siteId,
        page,
        pageSize
      })
      const existingEntry = entries.find((entry) => entry.key === key)
      entries = [
        {
          key,
          result,
          saved_at: existingEntry?.saved_at || now
        },
        ...entries.filter((entry) => entry.key !== key)
      ].slice(0, MAX_CACHED_RESULTS)
    })

    writePersistentCache({
      version: CACHE_VERSION,
      entries,
      recent_state: {
        keyword: keyword.value,
        active_site_id: activeSiteId.value,
        result_map: resultMap.value,
        has_searched: hasSearched.value,
        saved_at: now
      }
    })
  }

  const getCachedSiteResult = ({ wd, siteId, page, pageSize }) => {
    const key = buildCacheKey({
      keyword: wd,
      siteId,
      page,
      pageSize
    })
    const cache = readPersistentCache()
    const entry = cache.entries.find((item) => item.key === key)
    if (!entry) return null

    const site = useResourceStore().sites.find((item) => item.site_id === siteId)
    return site ? buildCachedSiteResult(site, entry.result) : entry.result
  }

  const clearResults = () => {
    abortController?.abort()
    searchSeq++
    loading.value = false
    resultMap.value = {}
    failureMap.value = {}
    statusMap.value = {}
    activeSiteId.value = ''
    hasSearched.value = false
    removePersistentCache()
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
      // 默认展示配置顺序中的第一个资源站，不受各站请求完成顺序影响
      activeSiteId.value = sites[0].site_id

      const queue = []
      let wakeResolve = null
      const wake = () => {
        if (wakeResolve) {
          wakeResolve()
          wakeResolve = null
        }
      }
      const waitWake = () => new Promise((resolve) => { wakeResolve = resolve })
      const push = (item) => {
        queue.push(item)
        wake()
      }

      const cachedResults = new Map()
      const initialStatus = {}
      sites.forEach((site) => {
        const cachedResult = getCachedSiteResult({
          wd,
          siteId: site.site_id,
          page,
          pageSize
        })
        if (cachedResult) {
          cachedResults.set(site.site_id, cachedResult)
          initialStatus[site.site_id] = 'success'
        } else {
          initialStatus[site.site_id] = 'loading'
        }
      })
      statusMap.value = initialStatus

      // 记录搜索历史，失败不影响搜索流程
      recordSearchHistory(wd).catch(() => {})

      let settled = 0
      const total = sites.length
      const settle = () => {
        settled++
        if (settled === total) push(null)
      }

      sites.forEach((site) => {
        const cachedResult = cachedResults.get(site.site_id)
        if (cachedResult) {
          push({ ok: true, site, result: cachedResult, cached: true })
          settle()
          return
        }

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
          .finally(settle)
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
          const result = item.cached
            ? item.result
            : buildSiteResult(item.site, item.data, page, pageSize)
          resultMap.value = {
            ...resultMap.value,
            [item.site.site_id]: result
          }
          statusMap.value = { ...statusMap.value, [item.site.site_id]: 'success' }
        } else {
          failureMap.value = {
            ...failureMap.value,
            [item.site.site_id]: { site: item.site, message: item.message }
          }
          statusMap.value = { ...statusMap.value, [item.site.site_id]: 'failed' }
        }
        await nextTick()
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

      const cachedResult = getCachedSiteResult({ wd, siteId, page, pageSize })
      let result = cachedResult
      if (!result) {
        const response = await searchVideos({ wd, siteId, page, pageSize })
        result = buildSiteResult(site, response.data, page, pageSize)
      }

      resultMap.value = {
        ...resultMap.value,
        [siteId]: result
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
      const page = 1
      const pageSize = DEFAULT_PAGE_SIZE
      const cachedResult = getCachedSiteResult({ wd, siteId, page, pageSize })
      let result = cachedResult
      if (!result) {
        const response = await searchVideos({ wd, siteId, page, pageSize })
        result = buildSiteResult(site, response.data, page, pageSize)
      }

      resultMap.value = {
        ...resultMap.value,
        [siteId]: result
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

function buildCachedSiteResult(site, result) {
  return {
    ...result,
    site: { ...site }
  }
}
