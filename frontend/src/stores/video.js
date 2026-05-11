import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { getVideoDetail } from '@/api/videos'

export const useVideoStore = defineStore('video', () => {
  const currentVideo = ref(null)
  const siteInfo = ref(null)
  const currentEpisode = ref(null)
  const loading = ref(false)
  const error = ref('')

  const playSources = computed(() => normalizePlaySources(currentVideo.value?.play_sources))
  const episodeList = computed(() =>
    playSources.value.flatMap((source) =>
      source.episodes.map((episode) => ({
        ...episode,
        format: source.format,
        sourceName: source.name
      }))
    )
  )
  const title = computed(() => currentVideo.value?.title || '')

  const fetchVideoDetail = async (params) => {
    loading.value = true
    error.value = ''
    currentVideo.value = null
    siteInfo.value = null
    currentEpisode.value = null
    try {
      const response = await getVideoDetail(params)
      currentVideo.value = response.data?.video || response.data || null
      siteInfo.value = {
        siteId: response.data?.site_id || params.siteId,
        siteName: response.data?.site_name || ''
      }
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

  const selectEpisodeByUrl = (url) => {
    const episode = episodeList.value.find((item) => item.url === url)
    currentEpisode.value = episode || null
    return currentEpisode.value
  }

  const clearCurrentVideo = () => {
    currentVideo.value = null
    siteInfo.value = null
    currentEpisode.value = null
  }

  return {
    currentVideo,
    siteInfo,
    currentEpisode,
    playSources,
    episodeList,
    title,
    loading,
    error,
    fetchVideoDetail,
    selectEpisode,
    selectEpisodeByUrl,
    clearCurrentVideo
  }
})

function normalizePlaySources(playSources) {
  if (!playSources || typeof playSources !== 'object') {
    return []
  }

  if (Array.isArray(playSources)) {
    return playSources.map((source) => ({
      format: source.format || source.name || 'mp4',
      name: source.name || source.format || '默认线路',
      episodes: source.episodes || []
    }))
  }

  return Object.entries(playSources).map(([format, episodes]) => ({
    format,
    name: format.toUpperCase(),
    episodes: Array.isArray(episodes) ? episodes : []
  }))
}
