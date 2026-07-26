import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  createResourceSite,
  deleteResourceSite,
  getResourceSites,
  testAllResourceSites,
  testResourceSite,
  toggleResourceSite,
  updateResourceSite
} from '@/api/resources'

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
    const enabledIds = enabledSites.value.map((site) => site.site_id)
    const testingPatch = Object.fromEntries(enabledIds.map((siteId) => [siteId, true]))
    testingMap.value = { ...testingMap.value, ...testingPatch }
    error.value = ''
    try {
      const response = await testAllResourceSites()
      const results = response.data?.results || []
      const resultPatch = Object.fromEntries(
        results.map((result) => [result.site_id, result])
      )
      testResultMap.value = { ...testResultMap.value, ...resultPatch }
      return response.data
    } catch (testAllError) {
      error.value = testAllError.message
      throw testAllError
    } finally {
      const donePatch = Object.fromEntries(enabledIds.map((siteId) => [siteId, false]))
      testingMap.value = { ...testingMap.value, ...donePatch }
    }
  }

  const createSite = async (siteData) => {
    error.value = ''
    try {
      const response = await createResourceSite(siteData)
      await fetchSites()
      return response.data
    } catch (createError) {
      error.value = createError.message
      throw createError
    }
  }

  const updateSite = async (siteId, siteData) => {
    error.value = ''
    try {
      const response = await updateResourceSite(siteId, siteData)
      await fetchSites()
      return response.data
    } catch (updateError) {
      error.value = updateError.message
      throw updateError
    }
  }

  const deleteSite = async (siteId) => {
    error.value = ''
    try {
      const response = await deleteResourceSite(siteId)
      const restResults = { ...testResultMap.value }
      delete restResults[siteId]
      testResultMap.value = restResults
      await fetchSites()
      return response.data
    } catch (deleteError) {
      error.value = deleteError.message
      throw deleteError
    }
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
    testEnabledSites,
    createSite,
    updateSite,
    deleteSite
  }
})
