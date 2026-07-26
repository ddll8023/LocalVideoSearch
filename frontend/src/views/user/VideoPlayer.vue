<template>
  <section class="grid gap-5 lg:grid-cols-[1fr_320px]">
    <main class="surface overflow-hidden rounded-lg">
      <div class="aspect-video bg-black">
        <div v-if="currentPlayUrl" ref="playerRef" class="h-full w-full" />
        <div v-else class="flex h-full items-center justify-center text-sm text-zinc-300">
          {{ videoStore.loading ? '正在加载播放地址…' : '暂无播放地址' }}
        </div>
      </div>
      <div class="border-t border-zinc-200 p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-sm text-primary-700">{{ videoStore.title || siteId }}</p>
            <h1 class="mt-1 truncate text-lg font-semibold text-zinc-900">{{ displayTitle }}</h1>
          </div>
          <RouterLink class="toolbar-button h-9 shrink-0" :to="detailLink">
            <font-awesome-icon :icon="['fas', 'arrow-left']" aria-hidden="true" />
            <span>详情</span>
          </RouterLink>
        </div>
        <AppAlert
          v-if="videoStore.error"
          class="mt-3"
          :message="videoStore.error"
          show-retry
          @retry="loadDetail"
        />
      </div>
    </main>

    <aside class="surface space-y-4 rounded-lg p-4">
      <div v-if="videoStore.playSources.length > 1">
        <h2 class="mb-2 text-sm font-semibold text-zinc-900">播放线路</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="source in videoStore.playSources"
            :key="source.name"
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition"
            :class="source.name === activeLineName
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-zinc-200 bg-white text-zinc-600 hover:border-primary-300'"
            @click="switchLine(source.name)"
          >
            <span>{{ source.name }}</span>
            <span class="rounded bg-zinc-100 px-1 text-[10px] uppercase text-zinc-400">
              {{ source.format }}
            </span>
          </button>
        </div>
      </div>

      <div>
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-zinc-900">剧集列表</h2>
          <label class="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500">
            <input v-model="autoNext" type="checkbox" class="h-3.5 w-3.5 accent-primary-600" />
            <span>自动连播</span>
          </label>
        </div>

        <AppLoadingState v-if="videoStore.loading" :framed="false" text="加载中" />

        <AppEmptyState
          v-else-if="currentEpisodes.length === 0"
          :framed="false"
          :icon="['fas', 'list']"
          title="暂无剧集数据"
          description="加载详情后会显示可切换剧集"
        />

        <div v-else class="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto pr-1">
          <button
            v-for="(episode, index) in currentEpisodes"
            :key="`${activeLineName}-${index}`"
            class="w-full rounded-md border px-3 py-2 text-left text-sm transition"
            :class="index === currentEpisodeIndex
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-primary-300'"
            type="button"
            @click="switchEpisode(index)"
          >
            <span class="block truncate font-medium">{{ episode.name }}</span>
          </button>
        </div>
      </div>
    </aside>
  </section>
</template>

<script setup>
/**
 * 视频播放页
 * 功能描述：基于 Artplayer 的视频播放，支持多线路切换、剧集切换、自动连播、播放进度记忆与续播、音量倍速记忆
 * 依赖组件：AppAlert、AppEmptyState、AppLoadingState
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Artplayer from 'artplayer'
import Hls from 'hls.js'

import { useToastStore } from '@/stores/toast'
import { useVideoStore } from '@/stores/video'

import { getPlayRecordDetail, upsertPlayRecord } from '@/api/playRecords'

import AppAlert from '@/components/base/AppAlert.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import AppLoadingState from '@/components/base/AppLoadingState.vue'

const VOLUME_KEY = 'videosearch.player.volume'
const RATE_KEY = 'videosearch.player.rate'
const AUTONEXT_KEY = 'videosearch.player.autonext'
const SAVE_INTERVAL_MS = 10000

const props = defineProps({
  siteId: { type: String, required: true },
  vodId: { type: String, required: true },
  keyword: { type: String, default: '' },
  page: { type: [String, Number], default: 1 },
  url: { type: String, default: '' },
  title: { type: String, default: '' },
  line: { type: String, default: '' },
  episode: { type: [String, Number], default: 0 }
})

const router = useRouter()
const videoStore = useVideoStore()
const toastStore = useToastStore()

const playerRef = ref(null)
const currentLineName = ref(props.line || '')
const currentEpisodeIndex = ref(Math.max(Number(props.episode) || 0, 0))
const autoNext = ref(localStorage.getItem(AUTONEXT_KEY) !== 'false')

let art = null
let pendingSeek = 0
let lastSaveAt = 0

const currentLine = computed(() => {
  const sources = videoStore.playSources
  if (sources.length === 0) return null
  return sources.find((source) => source.name === currentLineName.value) || sources[0]
})
const activeLineName = computed(() => currentLine.value?.name || '')
const currentEpisodes = computed(() => currentLine.value?.episodes || [])
const currentEpisode = computed(() => currentEpisodes.value[currentEpisodeIndex.value] || null)
const currentPlayUrl = computed(() => currentEpisode.value?.url || props.url)
const currentFormat = computed(() => {
  if (currentLine.value) return currentLine.value.format
  return (props.url || '').includes('.m3u8') ? 'm3u8' : 'mp4'
})
const displayTitle = computed(
  () => currentEpisode.value?.name || props.title || videoStore.title || '视频播放'
)
const detailLink = computed(() => ({
  name: 'VideoDetail',
  params: { siteId: props.siteId, vodId: props.vodId },
  query: { keyword: props.keyword, page: props.page }
}))

/**
 * 加载详情并定位线路与剧集
 */
const loadDetail = async () => {
  if (!props.keyword) return
  try {
    await videoStore.fetchVideoDetail({
      keyword: props.keyword,
      siteId: props.siteId,
      vodId: props.vodId,
      page: props.page
    })
    syncPositionFromProps()
    await loadResumeRecord()
  } catch {
    // 错误状态由 Store 统一维护。
  }
}

const syncPositionFromProps = () => {
  const sources = videoStore.playSources
  if (sources.length === 0) return

  let line = props.line ? sources.find((source) => source.name === props.line) : null
  if (!line && props.url) {
    line = sources.find((source) => source.episodes.some((episode) => episode.url === props.url))
  }
  if (!line) line = sources[0]
  currentLineName.value = line.name

  let index = props.url
    ? line.episodes.findIndex((episode) => episode.url === props.url)
    : -1
  if (index < 0) {
    index = Math.min(Math.max(Number(props.episode) || 0, 0), line.episodes.length - 1)
  }
  currentEpisodeIndex.value = Math.max(index, 0)
}

const loadResumeRecord = async () => {
  try {
    const response = await getPlayRecordDetail({ siteId: props.siteId, vodId: props.vodId })
    const record = response.data
    if (!record || record.position_seconds <= 5) return
    if (
      record.line_name === currentLineName.value &&
      record.episode_index === currentEpisodeIndex.value
    ) {
      pendingSeek = record.position_seconds
      applyPendingSeek()
      toastStore.info(`已从 ${formatPlayTime(record.position_seconds)} 继续播放`)
    }
  } catch {
    // 无播放记录或查询失败时从头播放。
  }
}

const applyPendingSeek = () => {
  if (!art || pendingSeek <= 0) return
  if (art.duration > 0) {
    art.seek = pendingSeek
    pendingSeek = 0
  } else {
    art.once('video:loadedmetadata', () => {
      if (pendingSeek > 0) {
        art.seek = pendingSeek
        pendingSeek = 0
      }
    })
  }
}

/**
 * 播放器生命周期
 */
const playM3u8 = (video, url, artInstance) => {
  if (Hls.isSupported()) {
    if (artInstance.hls) artInstance.hls.destroy()
    const hls = new Hls()
    hls.loadSource(url)
    hls.attachMedia(video)
    artInstance.hls = hls
    artInstance.on('destroy', () => hls.destroy())
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url
  } else {
    toastStore.error('当前环境不支持 m3u8 播放')
  }
}

const destroyPlayer = () => {
  if (!art) return
  art.destroy(true)
  art = null
}

const setupPlayer = async (url) => {
  destroyPlayer()
  await nextTick()
  if (!url || !playerRef.value) return

  art = new Artplayer({
    container: playerRef.value,
    url,
    type: currentFormat.value === 'm3u8' ? 'm3u8' : '',
    customType: { m3u8: playM3u8 },
    volume: Number(localStorage.getItem(VOLUME_KEY) ?? 0.7),
    autoplay: true,
    playbackRate: true,
    setting: true,
    hotkey: true,
    pip: true,
    fullscreen: true,
    fullscreenWeb: true,
    theme: '#2563eb',
    lang: 'zh-cn'
  })

  art.on('ready', () => {
    const savedRate = Number(localStorage.getItem(RATE_KEY))
    if (savedRate > 0 && savedRate !== 1) {
      art.playbackRate = savedRate
    }
    applyPendingSeek()
  })
  art.on('video:volumechange', () => {
    localStorage.setItem(VOLUME_KEY, String(art.volume))
  })
  art.on('video:ratechange', () => {
    localStorage.setItem(RATE_KEY, String(art.playbackRate))
  })
  art.on('video:timeupdate', () => {
    if (Date.now() - lastSaveAt >= SAVE_INTERVAL_MS) {
      saveProgress()
    }
  })
  art.on('video:pause', () => saveProgress())
  art.on('video:ended', handleEnded)
  art.on('error', () => {
    toastStore.error('播放失败，可尝试切换线路或剧集')
  })
}

/**
 * 播放进度记忆
 */
const saveProgress = (positionOverride = null) => {
  if (!art || !props.keyword) return
  const position = positionOverride ?? Math.floor(art.currentTime || 0)
  if (position < 1 && positionOverride === null) return

  lastSaveAt = Date.now()
  upsertPlayRecord({
    siteId: props.siteId,
    vodId: props.vodId,
    title: videoStore.title || props.title || '未命名视频',
    thumbnail: videoStore.currentVideo?.thumbnail || '',
    keyword: props.keyword,
    lineName: activeLineName.value,
    episodeIndex: currentEpisodeIndex.value,
    episodeName: currentEpisode.value?.name || '',
    positionSeconds: position,
    durationSeconds: Math.floor(art.duration || 0)
  }).catch(() => {})
}

const handleEnded = () => {
  if (!autoNext.value) return
  if (currentEpisodeIndex.value >= currentEpisodes.value.length - 1) return
  saveProgress(0)
  pendingSeek = 0
  currentEpisodeIndex.value += 1
  toastStore.info('自动播放下一集')
}

/**
 * 线路与剧集切换
 */
const switchLine = (lineName) => {
  if (lineName === activeLineName.value) return
  saveProgress()
  const sources = videoStore.playSources
  const line = sources.find((source) => source.name === lineName)
  if (!line) return
  pendingSeek = 0
  currentLineName.value = lineName
  currentEpisodeIndex.value = Math.min(
    currentEpisodeIndex.value,
    Math.max(line.episodes.length - 1, 0)
  )
}

const switchEpisode = (index) => {
  if (index === currentEpisodeIndex.value) return
  saveProgress()
  pendingSeek = 0
  currentEpisodeIndex.value = index
}

const syncRoute = () => {
  router.replace({
    name: 'VideoPlayer',
    params: { siteId: props.siteId, vodId: props.vodId },
    query: {
      keyword: props.keyword,
      page: props.page,
      line: activeLineName.value,
      episode: currentEpisodeIndex.value,
      url: currentPlayUrl.value,
      title: currentEpisode.value?.name || props.title
    }
  })
}

const formatPlayTime = (seconds) => {
  const total = Math.max(Math.floor(seconds || 0), 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (value) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`
}

watch(currentPlayUrl, (url, oldUrl) => {
  if (!url || url === oldUrl) return
  setupPlayer(url)
  if (videoStore.playSources.length > 0) {
    syncRoute()
  }
})

watch(autoNext, (value) => {
  localStorage.setItem(AUTONEXT_KEY, String(value))
})

onMounted(() => {
  if (props.url) {
    setupPlayer(props.url)
  }
  loadDetail()
})

onBeforeUnmount(() => {
  saveProgress()
  destroyPlayer()
})
</script>
