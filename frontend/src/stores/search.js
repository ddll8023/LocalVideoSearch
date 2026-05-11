import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { searchVideos } from '@/api/videos'
import { useResourceStore } from '@/stores/resources'

const CACHE_KEY = 'videosearch.search.state'
const CACHE_EXPIRE_MS = 2 * 60 * 60 * 1000
const DEFAULT_PAGE_SIZE = 20

export const useSearchStore = defineStore('search', () => {
  const keyword = ref('')
  const activeSiteId = ref('')
  const resultMap = ref({})
  const failureMap = ref({})
  const loading = ref(false)
  const error = ref('')
  const hasSearched = ref(false)

  const resultSites = computed(() => Object.values(resultMap.value))
  const activeResult = computed(() => resultMap.value[activeSiteId.value] || null)
  const hasResults = computed(() => resultSites.value.some((result) => result.lists.length > 0))
  const failedResults = computed(() => Object.values(failureMap.value))

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
      if (Date.now() - cache.saved_at > CACHE_EXPIRE_MS) {
        localStorage.removeItem(CACHE_KEY)
        return
      }

      keyword.value = cache.keyword || ''
      activeSiteId.value = cache.active_site_id || ''
      resultMap.value = cache.result_map || {}
      failureMap.value = cache.failure_map || {}
      hasSearched.value = Boolean(cache.has_searched || Object.keys(resultMap.value).length)
    } catch {
      localStorage.removeItem(CACHE_KEY)
    }
  }

  const saveCache = () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        keyword: keyword.value,
        active_site_id: activeSiteId.value,
        result_map: resultMap.value,
        failure_map: failureMap.value,
        has_searched: hasSearched.value,
        saved_at: Date.now()
      })
    )
  }

  const clearResults = () => {
    resultMap.value = {}
    failureMap.value = {}
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

    loading.value = true
    error.value = ''
    resultMap.value = {}
    failureMap.value = {}
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

      const responses = await Promise.allSettled(
        resourceStore.enabledSites.map((site) =>
          searchVideos({
            wd,
            siteId: site.site_id,
            page,
            pageSize
          }).then((response) => ({
            site,
            payload: response.data
          }))
        )
      )

      const nextResultMap = {}
      const nextFailureMap = {}
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          const { site, payload } = response.value
          nextResultMap[site.site_id] = buildSiteResult(site, payload, page, pageSize)
          return
        }

        const site = resourceStore.enabledSites[index]
        if (!site) return
        nextFailureMap[site.site_id] = {
          site,
          message: response.reason?.message || '搜索失败'
        }
      })

      resultMap.value = nextResultMap
      failureMap.value = nextFailureMap
      activeSiteId.value = Object.keys(nextResultMap)[0] || ''
      saveCache()
    } catch (searchError) {
      error.value = searchError.message
      throw searchError
    } finally {
      loading.value = false
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
      activeSiteId.value = siteId
      saveCache()
    } catch (searchError) {
      error.value = searchError.message
      throw searchError
    } finally {
      loading.value = false
    }
  }

  return {
    keyword,
    activeSiteId,
    resultMap,
    failureMap,
    resultSites,
    activeResult,
    hasResults,
    failedResults,
    loading,
    error,
    hasSearched,
    setKeyword,
    setActiveSite,
    restoreCache,
    saveCache,
    clearResults,
    searchAcrossSites,
    searchSitePage
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
