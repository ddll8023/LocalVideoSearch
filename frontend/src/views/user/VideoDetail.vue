<template>
  <section class="space-y-6">
    <RouterLink class="toolbar-button w-fit" to="/">
      <font-awesome-icon :icon="['fas', 'arrow-left']" aria-hidden="true" />
      <span>返回搜索</span>
    </RouterLink>

    <AppLoadingState v-if="videoStore.loading" text="正在加载详情" />

    <AppAlert v-if="videoStore.error" :message="videoStore.error" show-retry @retry="loadDetail" />

    <section v-if="videoStore.currentVideo" class="surface surface-reveal grid gap-6 rounded-lg p-5 lg:grid-cols-[260px_1fr]">
      <div class="aspect-[3/4] overflow-hidden rounded-md bg-zinc-100">
        <img
          v-if="videoStore.currentVideo.thumbnail && !posterFailed"
          class="h-full w-full object-cover"
          :src="videoStore.currentVideo.thumbnail"
          :alt="videoStore.title"
          @error="posterFailed = true"
        />
        <div v-else class="flex h-full items-center justify-center text-zinc-300">
          <font-awesome-icon :icon="['fas', 'film']" class="text-4xl" aria-hidden="true" />
        </div>
      </div>
      <div class="space-y-5">
        <div>
          <p class="text-sm font-medium text-primary-700">
            {{ videoStore.siteInfo?.siteName || videoStore.currentVideo.platform || siteId }}
          </p>
          <div class="mt-2 flex items-start justify-between gap-4">
            <h1 class="text-2xl font-semibold text-zinc-900">{{ videoStore.title || '视频详情' }}</h1>
            <button
              type="button"
              class="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition"
              :class="favorited
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                : 'border-zinc-200 bg-zinc-100/70 text-zinc-600 hover:border-red-300 hover:text-red-500'"
              :disabled="favoriteLoading"
              @click="toggleFavorite"
            >
              <font-awesome-icon
                :icon="favoriteLoading ? ['fas', 'spinner'] : [favorited ? 'fas' : 'far', 'heart']"
                :class="favoriteLoading ? 'fa-spin' : ''"
                aria-hidden="true"
              />
              <span>{{ favorited ? '已收藏' : '收藏' }}</span>
            </button>
          </div>
          <p class="mt-3 text-sm leading-6 text-zinc-600">{{ videoStore.currentVideo.description || '暂无简介' }}</p>
        </div>

        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div v-for="item in metaItems" :key="item.label" class="rounded-md bg-zinc-50 px-3 py-2">
            <dt class="text-xs text-zinc-500">{{ item.label }}</dt>
            <dd class="mt-1 font-medium text-zinc-900">{{ item.value || '-' }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <section v-if="videoStore.currentVideo" class="surface surface-reveal rounded-lg p-5" style="animation-delay: 100ms">
      <div class="mb-4 flex items-center gap-2">
        <font-awesome-icon :icon="['fas', 'layer-group']" class="text-primary-700" aria-hidden="true" />
        <h2 class="text-base font-semibold text-zinc-900">播放源</h2>
        <span v-if="videoStore.playSources.length > 1" class="text-xs text-zinc-400">
          {{ videoStore.playSources.length }} 条线路
        </span>
      </div>

      <AppEmptyState
        v-if="videoStore.playSources.length === 0"
        :framed="false"
        :icon="['fas', 'play']"
        title="暂无播放源"
        description="该资源站没有返回可播放地址"
      />

      <div v-for="source in videoStore.playSources" :key="source.name" class="mb-6 last:mb-0">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-zinc-700">{{ source.name }}</h3>
            <span class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-400">
              {{ source.format }}
            </span>
          </div>
          <span class="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
            {{ source.episodes.length }} 集
          </span>
        </div>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="(episode, index) in source.episodes"
            :key="`${source.name}-${index}`"
            class="toolbar-button h-9"
            :to="buildPlayLink(source, episode, index)"
          >
            <font-awesome-icon :icon="['fas', 'play']" aria-hidden="true" />
            <span>{{ episode.name }}</span>
          </RouterLink>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
/**
 * 视频详情页
 * 功能描述：加载视频详情，展示元信息、收藏入口和按线路分组的播放源
 * 依赖组件：AppAlert、AppEmptyState、AppLoadingState
 */
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useVideoStore } from '@/stores/video'

import { addFavorite, getFavoriteStatus, removeFavorite } from '@/api/favorites'

import AppAlert from '@/components/base/AppAlert.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import AppLoadingState from '@/components/base/AppLoadingState.vue'

const props = defineProps({
  siteId: { type: String, required: true },
  vodId: { type: String, required: true },
  keyword: { type: String, default: '' },
  page: { type: [String, Number], default: 1 }
})

const videoStore = useVideoStore()
const toastStore = useToastStore()

const posterFailed = ref(false)
const favorited = ref(false)
const favoriteId = ref(null)
const favoriteLoading = ref(false)

const metaItems = computed(() => [
  { label: '年份', value: videoStore.currentVideo?.year },
  { label: '地区', value: videoStore.currentVideo?.area },
  { label: '语言', value: videoStore.currentVideo?.language },
  { label: '类型', value: videoStore.currentVideo?.type_name },
  { label: '状态', value: videoStore.currentVideo?.status },
  { label: '评分', value: formatScore(videoStore.currentVideo?.score) },
  { label: '导演', value: videoStore.currentVideo?.director },
  { label: '演员', value: videoStore.currentVideo?.actor },
  { label: '总集数', value: formatEpisodeTotal(videoStore.currentVideo?.total_episodes) },
  { label: '更新时间', value: videoStore.currentVideo?.update_time }
])

onMounted(() => {
  loadDetail()
  loadFavoriteStatus()
})

watch(
  () => [props.siteId, props.vodId, props.keyword, props.page],
  () => {
    posterFailed.value = false
    loadDetail()
    loadFavoriteStatus()
  }
)

const loadDetail = async () => {
  if (!props.keyword) {
    videoStore.clearCurrentVideo()
    videoStore.error = '缺少搜索关键词，无法定位视频详情'
    return
  }

  try {
    await videoStore.fetchVideoDetail({
      keyword: props.keyword,
      siteId: props.siteId,
      vodId: props.vodId,
      page: props.page
    })
  } catch {
    // 错误状态由 Store 统一维护。
  }
}

/**
 * 收藏交互
 */
const loadFavoriteStatus = async () => {
  try {
    const response = await getFavoriteStatus({ siteId: props.siteId, vodId: props.vodId })
    favorited.value = Boolean(response.data?.favorited)
    favoriteId.value = response.data?.favorite_id || null
  } catch {
    // 收藏状态加载失败不影响详情展示。
  }
}

const toggleFavorite = async () => {
  if (favoriteLoading.value) return
  favoriteLoading.value = true
  try {
    if (favorited.value && favoriteId.value) {
      await removeFavorite(favoriteId.value)
      favorited.value = false
      favoriteId.value = null
      toastStore.success('已取消收藏')
    } else {
      const video = videoStore.currentVideo
      if (!video) return
      const response = await addFavorite({
        siteId: props.siteId,
        vodId: props.vodId,
        title: video.title || '未命名视频',
        thumbnail: video.thumbnail,
        typeName: video.type_name,
        remarks: video.status,
        keyword: props.keyword
      })
      favorited.value = true
      favoriteId.value = response.data?.id || null
      toastStore.success('收藏成功')
    }
  } catch (err) {
    toastStore.error(err.message || '操作失败')
  } finally {
    favoriteLoading.value = false
  }
}

const formatScore = (score) => {
  const value = Number(score)
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : ''
}

const formatEpisodeTotal = (total) => {
  const value = Number(total)
  return Number.isFinite(value) && value > 0 ? `${value} 集` : ''
}

const buildPlayLink = (source, episode, index) => ({
  name: 'VideoPlayer',
  params: {
    siteId: props.siteId,
    vodId: props.vodId
  },
  query: {
    keyword: props.keyword,
    page: props.page,
    url: episode.url,
    title: episode.name,
    line: source.name,
    episode: index
  }
})
</script>
