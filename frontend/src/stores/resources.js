import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { getResourceSites, testResourceSite, toggleResourceSite } from '@/api/resources'

export const useResourceStore = defineStore('resources', () => {
  const sites = ref([])
  const loading = ref(false)
  const error = ref('')
  const testingMap = ref({})

  const enabledSites = computed(() => sites.value.filter((site) => site.enabled))
  const stats = computed(() => ({
    total: sites.value.length,
    enabled: enabledSites.value.length,
    disabled: sites.value.length - enabledSites.value.length
  }))

  const fetchSites = async () => {
    loading.value = true
    error.value = ''
    try {
      const response = await getResourceSites()
      sites.value = response.data?.lists || []
      return response.data
    } catch (fetchError) {
      error.value = fetchError.message
      throw fetchError
    } finally {
      loading.value = false
    }
  }

  const toggleSite = async (siteId) => {
    const response = await toggleResourceSite(siteId)
    await fetchSites()
    return response.data
  }

  const testSite = async (siteId) => {
    testingMap.value = { ...testingMap.value, [siteId]: true }
    try {
      const response = await testResourceSite(siteId)
      return response.data
    } finally {
      testingMap.value = { ...testingMap.value, [siteId]: false }
    }
  }

  return {
    sites,
    loading,
    error,
    testingMap,
    enabledSites,
    stats,
    fetchSites,
    toggleSite,
    testSite
  }
})

