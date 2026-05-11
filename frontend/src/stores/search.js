import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { searchVideos } from '@/api/videos'
import { useResourceStore } from '@/stores/resources'

const CACHE_KEY = 'videosearch.search.state'
const CACHE_EXPIRE_MS = 2 * 60 * 60 * 1000

export const useSearchStore = defineStore('search', () => {
  const keyword = ref('')
  const activeSiteId = ref('')
  const resultMap = ref({})
  const loading = ref(false)
  const error = ref('')

  const resultSites = computed(() => Object.values(resultMap.value))
  const activeResult = computed(() => resultMap.value[activeSiteId.value] || null)

  const setKeyword = (value) => {
    keyword.value = value
  }

  const setActiveSite = (siteId) => {
    activeSiteId.value = siteId
  }

  const restoreCache = () => {
    const rawCache = localStorage.getItem(CACHE_KEY)
    if (!rawCache) return

    const cache = JSON.parse(rawCache)
    if (Date.now() - cache.saved_at > CACHE_EXPIRE_MS) {
      localStorage.removeItem(CACHE_KEY)
      return
    }

    keyword.value = cache.keyword || ''
    activeSiteId.value = cache.active_site_id || ''
    resultMap.value = cache.result_map || {}
  }

  const saveCache = () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        keyword: keyword.value,
        active_site_id: activeSiteId.value,
        result_map: resultMap.value,
        saved_at: Date.now()
      })
    )
  }

  const searchAcrossSites = async ({ page = 1, pageSize = 20 } = {}) => {
    const wd = keyword.value.trim()
    if (!wd) {
      error.value = '请输入关键词'
      return
    }

    loading.value = true
    error.value = ''
    resultMap.value = {}

    try {
      const resourceStore = useResourceStore()
      if (resourceStore.sites.length === 0) {
        await resourceStore.fetchSites()
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
      responses.forEach((response) => {
        if (response.status !== 'fulfilled') return

        const { site, payload } = response.value
        nextResultMap[site.site_id] = {
          site,
          lists: payload?.lists || [],
          pagination: payload?.pagination || { page, page_size: pageSize, total: 0, total_pages: 0 },
          filterStats: payload?.filter_stats || null
        }
      })

      resultMap.value = nextResultMap
      activeSiteId.value = Object.keys(nextResultMap)[0] || ''
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
    resultSites,
    activeResult,
    loading,
    error,
    setKeyword,
    setActiveSite,
    restoreCache,
    saveCache,
    searchAcrossSites
  }
})

