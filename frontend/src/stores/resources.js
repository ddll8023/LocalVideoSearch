import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { getResourceSites, testResourceSite, toggleResourceSite } from '@/api/resources'

export const useResourceStore = defineStore('resources', () => {
  const sites = ref([])
  const remoteStats = ref(null)
  const loading = ref(false)
  const error = ref('')
  const testingMap = ref({})
  const togglingMap = ref({})
  const testResultMap = ref({})

  const enabledSites = computed(() => sites.value.filter((site) => site.enabled))
  const stats = computed(() => ({
    total: remoteStats.value?.total_sites ?? sites.value.length,
    enabled: remoteStats.value?.enabled_sites ?? enabledSites.value.length,
    disabled:
      remoteStats.value?.disabled_sites ?? sites.value.length - enabledSites.value.length
  }))

  const fetchSites = async () => {
    loading.value = true
    error.value = ''
    try {
      const response = await getResourceSites()
      sites.value = response.data?.lists || []
      remoteStats.value = response.data?.stats || null
      return response.data
    } catch (fetchError) {
      error.value = fetchError.message
      throw fetchError
    } finally {
      loading.value = false
    }
  }

  const toggleSite = async (siteId) => {
    togglingMap.value = { ...togglingMap.value, [siteId]: true }
    error.value = ''
    try {
      const response = await toggleResourceSite(siteId)
      await fetchSites()
      return response.data
    } catch (toggleError) {
      error.value = toggleError.message
      throw toggleError
    } finally {
      togglingMap.value = { ...togglingMap.value, [siteId]: false }
    }
  }

  const testSite = async (siteId) => {
    testingMap.value = { ...testingMap.value, [siteId]: true }
    error.value = ''
    try {
      const response = await testResourceSite(siteId)
      testResultMap.value = {
        ...testResultMap.value,
        [siteId]: response.data
      }
      return response.data
    } catch (testError) {
      error.value = testError.message
      testResultMap.value = {
        ...testResultMap.value,
        [siteId]: {
          site_id: siteId,
          success: false,
          message: testError.message,
          elapsed_ms: 0
        }
      }
      throw testError
    } finally {
      testingMap.value = { ...testingMap.value, [siteId]: false }
    }
  }

  const testEnabledSites = async () => {
    const results = []
    for (const site of enabledSites.value) {
      try {
        results.push(await testSite(site.site_id))
      } catch {
        // 单站点失败已写入 testResultMap，继续测试其余站点。
      }
    }
    return results
  }

  return {
    sites,
    remoteStats,
    loading,
    error,
    testingMap,
    togglingMap,
    testResultMap,
    enabledSites,
    stats,
    fetchSites,
    toggleSite,
    testSite,
    testEnabledSites
  }
})
