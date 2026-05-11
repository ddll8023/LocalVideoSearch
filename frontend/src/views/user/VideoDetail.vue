<template>
  <section class="space-y-6">
    <RouterLink class="toolbar-button w-fit" to="/">
      <font-awesome-icon :icon="['fas', 'arrow-left']" aria-hidden="true" />
      <span>返回搜索</span>
    </RouterLink>

    <div v-if="videoStore.loading" class="surface rounded-lg px-5 py-12 text-center text-sm text-zinc-500">
      <font-awesome-icon :icon="['fas', 'spinner']" class="fa-spin mr-2" aria-hidden="true" />
      正在加载详情
    </div>

    <div v-if="videoStore.error" class="surface rounded-lg border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="mr-2" aria-hidden="true" />
      {{ videoStore.error }}
    </div>

    <section v-if="videoStore.currentVideo" class="surface grid gap-6 rounded-lg p-5 lg:grid-cols-[260px_1fr]">
      <div class="aspect-[3/4] overflow-hidden rounded-md bg-zinc-100">
        <img
          v-if="videoStore.currentVideo.thumbnail"
          class="h-full w-full object-cover"
          :src="videoStore.currentVideo.thumbnail"
          :alt="videoStore.title"
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
          <h1 class="mt-2 text-2xl font-semibold text-zinc-900">{{ videoStore.title || '视频详情' }}</h1>
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

    <section v-if="videoStore.currentVideo" class="surface rounded-lg p-5">
      <div class="mb-4 flex items-center gap-2">
        <font-awesome-icon :icon="['fas', 'layer-group']" class="text-primary-700" aria-hidden="true" />
        <h2 class="text-base font-semibold text-zinc-900">播放源</h2>
      </div>

      <div v-if="videoStore.playSources.length === 0" class="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
        暂无播放源
      </div>

      <div v-for="source in videoStore.playSources" :key="source.format" class="mb-6 last:mb-0">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-zinc-700">{{ source.name }}</h3>
          <span class="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
            {{ source.episodes.length }} 集
          </span>
        </div>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="episode in source.episodes"
            :key="episode.url"
            class="toolbar-button h-9"
            :to="buildPlayLink(episode)"
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
 * 功能描述：根据路由参数加载视频详情并展示按格式分组的播放源
 */
import { computed, onMounted, watch } from 'vue'

import { useVideoStore } from '@/stores/video'

const props = defineProps({
  siteId: { type: String, required: true },
  vodId: { type: String, required: true },
  keyword: { type: String, default: '' },
  page: { type: [String, Number], default: 1 }
})

const videoStore = useVideoStore()

const metaItems = computed(() => [
  { label: '年份', value: videoStore.currentVideo?.year },
  { label: '地区', value: videoStore.currentVideo?.area },
  { label: '语言', value: videoStore.currentVideo?.language },
  { label: '类型', value: videoStore.currentVideo?.type_name },
  { label: '状态', value: videoStore.currentVideo?.status },
  { label: '演员', value: videoStore.currentVideo?.actor },
  { label: '频道', value: videoStore.currentVideo?.channel },
  { label: '播放量', value: videoStore.currentVideo?.view_count }
])

onMounted(() => {
  loadDetail()
})

watch(
  () => [props.siteId, props.vodId, props.keyword, props.page],
  () => {
    loadDetail()
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

const buildPlayLink = (episode) => ({
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
</script>
