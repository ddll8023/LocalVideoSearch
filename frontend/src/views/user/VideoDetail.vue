<template>
  <section class="space-y-6">
    <div v-if="videoStore.error" class="surface rounded-lg border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ videoStore.error }}
    </div>

    <div class="surface grid gap-6 rounded-lg p-5 lg:grid-cols-[260px_1fr]">
      <div class="aspect-[3/4] overflow-hidden rounded-md bg-zinc-100">
        <img
          v-if="videoStore.currentVideo?.thumbnail"
          class="h-full w-full object-cover"
          :src="videoStore.currentVideo.thumbnail"
          :alt="videoStore.title"
        />
      </div>
      <div class="space-y-5">
        <div>
          <p class="text-sm font-medium text-primary-700">{{ videoStore.currentVideo?.platform || siteId }}</p>
          <h1 class="mt-2 text-2xl font-semibold text-zinc-900">{{ videoStore.title || '视频详情' }}</h1>
          <p class="mt-3 text-sm leading-6 text-zinc-600">{{ videoStore.currentVideo?.description || '暂无简介' }}</p>
        </div>

        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div v-for="item in metaItems" :key="item.label" class="rounded-md bg-zinc-50 px-3 py-2">
            <dt class="text-xs text-zinc-500">{{ item.label }}</dt>
            <dd class="mt-1 font-medium text-zinc-900">{{ item.value || '-' }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="surface rounded-lg p-5">
      <div class="mb-4 flex items-center gap-2">
        <font-awesome-icon :icon="['fas', 'play']" class="text-primary-700" aria-hidden="true" />
        <h2 class="text-base font-semibold text-zinc-900">播放源</h2>
      </div>
      <div v-if="videoStore.playSources.length === 0" class="text-sm text-zinc-500">暂无播放源</div>
      <div v-for="source in videoStore.playSources" :key="source.name || source.format" class="mb-5 last:mb-0">
        <h3 class="mb-3 text-sm font-semibold text-zinc-700">{{ source.name || source.format || '默认线路' }}</h3>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="episode in source.episodes || []"
            :key="episode.url"
            class="toolbar-button h-9"
            :to="buildPlayLink(episode)"
          >
            {{ episode.name }}
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 视频详情页
 * 功能描述：根据路由参数加载视频详情并展示播放源
 */
import { computed, onMounted } from 'vue'

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
  { label: '演员', value: videoStore.currentVideo?.actor }
])

onMounted(() => {
  if (!props.keyword) return
  videoStore.fetchVideoDetail({
    keyword: props.keyword,
    siteId: props.siteId,
    vodId: props.vodId,
    page: props.page
  })
})

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

