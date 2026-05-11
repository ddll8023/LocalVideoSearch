import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { getVideoDetail } from '@/api/videos'

export const useVideoStore = defineStore('video', () => {
  const currentVideo = ref(null)
  const currentEpisode = ref(null)
  const loading = ref(false)
  const error = ref('')

  const playSources = computed(() => currentVideo.value?.play_sources || [])
  const title = computed(() => currentVideo.value?.title || '')

  const fetchVideoDetail = async (params) => {
    loading.value = true
    error.value = ''
    try {
      const response = await getVideoDetail(params)
      currentVideo.value = response.data?.video || response.data || null
      currentEpisode.value = null
      return currentVideo.value
    } catch (fetchError) {
      error.value = fetchError.message
      throw fetchError
    } finally {
      loading.value = false
    }
  }

  const selectEpisode = (episode) => {
    currentEpisode.value = episode
  }

  return {
    currentVideo,
    currentEpisode,
    playSources,
    title,
    loading,
    error,
    fetchVideoDetail,
    selectEpisode
  }
})

