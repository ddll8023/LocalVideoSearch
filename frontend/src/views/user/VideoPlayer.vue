<template>
  <section class="grid gap-5 lg:grid-cols-[1fr_320px]">
    <main class="surface overflow-hidden rounded-lg">
      <div class="aspect-video bg-black">
        <video
          v-if="sourceUrl"
          ref="videoRef"
          class="h-full w-full"
          controls
          playsinline
        />
        <div v-else class="flex h-full items-center justify-center text-sm text-zinc-300">
          暂无播放地址
        </div>
      </div>
      <div class="border-t border-zinc-200 p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-sm text-primary-700">{{ videoStore.title || siteId }}</p>
            <h1 class="mt-1 text-lg font-semibold text-zinc-900">{{ displayTitle }}</h1>
          </div>
          <RouterLink class="toolbar-button h-9" :to="detailLink">
            <font-awesome-icon :icon="['fas', 'arrow-left']" aria-hidden="true" />
            <span>详情</span>
          </RouterLink>
        </div>
        <p v-if="videoStore.error" class="mt-3 text-sm text-red-700">
          <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="mr-2" aria-hidden="true" />
          {{ videoStore.error }}
        </p>
      </div>
    </main>

    <aside class="surface rounded-lg p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-zinc-900">剧集列表</h2>
        <span class="text-xs text-zinc-400">{{ videoStore.episodeList.length }} 集</span>
      </div>

      <div v-if="videoStore.loading" class="py-8 text-center text-sm text-zinc-500">
        <font-awesome-icon :icon="['fas', 'spinner']" class="fa-spin mr-2" aria-hidden="true" />
        加载中
      </div>

      <div v-else-if="videoStore.episodeList.length === 0" class="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-8 text-center text-sm text-zinc-500">
        暂无剧集数据
      </div>

      <div v-else class="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1">
        <button
          v-for="episode in videoStore.episodeList"
          :key="episode.url"
          class="w-full rounded-md border px-3 py-2 text-left text-sm transition"
          :class="episode.url === sourceUrl ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-zinc-200 bg-white text-zinc-700 hover:border-primary-300'"
          type="button"
          @click="switchEpisode(episode)"
        >
          <span class="block truncate font-medium">{{ episode.name }}</span>
          <span class="mt-1 block text-xs text-zinc-400">{{ episode.format.toUpperCase() }}</span>
        </button>
      </div>
    </aside>
  </section>
</template>

<script setup>
/**
 * 视频播放页
 * 功能描述：播放当前视频地址，并展示同视频的剧集切换列表
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Hls from 'hls.js'

import { useVideoStore } from '@/stores/video'

const props = defineProps({
  siteId: { type: String, required: true },
  vodId: { type: String, required: true },
  keyword: { type: String, default: '' },
  page: { type: [String, Number], default: 1 },
  url: { type: String, default: '' },
  title: { type: String, default: '' }
})

const router = useRouter()
const videoStore = useVideoStore()
const videoRef = ref(null)
const hlsInstance = ref(null)
const sourceUrl = computed(() => props.url)
const displayTitle = computed(() => props.title || videoStore.currentEpisode?.name || '视频播放')
const detailLink = computed(() => ({
  name: 'VideoDetail',
  params: {
    siteId: props.siteId,
    vodId: props.vodId
  },
  query: {
    keyword: props.keyword,
    page: props.page
  }
}))

const destroyHls = () => {
  if (!hlsInstance.value) return
  hlsInstance.value.destroy()
  hlsInstance.value = null
}

const attachSource = async (url) => {
  destroyHls()
  await nextTick()
  if (!url || !videoRef.value) return

  if (url.includes('.m3u8') && Hls.isSupported()) {
    hlsInstance.value = new Hls()
    hlsInstance.value.loadSource(url)
    hlsInstance.value.attachMedia(videoRef.value)
    return
  }

  videoRef.value.src = url
}

const loadDetail = async () => {
  if (!props.keyword) return
  try {
    await videoStore.fetchVideoDetail({
      keyword: props.keyword,
      siteId: props.siteId,
      vodId: props.vodId,
      page: props.page
    })
    videoStore.selectEpisodeByUrl(sourceUrl.value)
  } catch {
    // 错误状态由 Store 统一维护。
  }
}

const switchEpisode = (episode) => {
  videoStore.selectEpisode(episode)
  router.replace({
    name: 'VideoPlayer',
    params: {
      siteId: props.siteId,
      vodId: props.vodId
    },
    query: {
      keyword: props.keyword,
      page: props.page,
      url: episode.url,
      title: episode.name
    }
  })
}

watch(
  sourceUrl,
  (url) => {
    videoStore.selectEpisodeByUrl(url)
    attachSource(url)
  },
  { immediate: true }
)

onMounted(() => {
  loadDetail()
  attachSource(sourceUrl.value)
})

onBeforeUnmount(() => {
  destroyHls()
})
</script>
