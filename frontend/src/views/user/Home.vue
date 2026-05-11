<template>
  <section class="space-y-6">
    <div class="surface rounded-lg p-5">
      <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="handleSearch">
        <label class="sr-only" for="keyword">关键词</label>
        <input
          id="keyword"
          v-model="draftKeyword"
          class="field-input"
          type="search"
          autocomplete="off"
          placeholder="输入影片、剧集或演员"
        />
        <button class="primary-button sm:w-32" type="submit" :disabled="searchStore.loading">
          <font-awesome-icon :icon="['fas', 'magnifying-glass']" aria-hidden="true" />
          <span>搜索</span>
        </button>
      </form>
    </div>

    <div v-if="searchStore.error" class="surface rounded-lg border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ searchStore.error }}
    </div>

    <div v-if="searchStore.resultSites.length > 0" class="surface overflow-hidden rounded-lg">
      <div class="flex gap-1 overflow-x-auto border-b border-zinc-200 px-4 py-3">
        <button
          v-for="result in searchStore.resultSites"
          :key="result.site.site_id"
          class="toolbar-button h-9"
          :class="searchStore.activeSiteId === result.site.site_id ? 'border-primary-600 text-primary-700' : ''"
          type="button"
          @click="searchStore.setActiveSite(result.site.site_id)"
        >
          <font-awesome-icon :icon="['fas', 'server']" aria-hidden="true" />
          <span>{{ result.site.name }}</span>
          <span class="text-xs text-zinc-400">{{ result.pagination.total }}</span>
        </button>
      </div>

      <div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <RouterLink
          v-for="video in searchStore.activeResult?.lists || []"
          :key="video.id"
          class="group overflow-hidden rounded-md border border-zinc-200 bg-white transition hover:border-primary-500 hover:shadow-lift"
          :to="buildDetailLink(video)"
        >
          <div class="aspect-[3/4] bg-zinc-100">
            <img
              v-if="video.thumbnail"
              class="h-full w-full object-cover"
              :src="video.thumbnail"
              :alt="video.title"
              loading="lazy"
            />
          </div>
          <div class="space-y-2 p-3">
            <h2 class="line-clamp-2 text-sm font-semibold text-zinc-900 group-hover:text-primary-700">
              {{ video.title }}
            </h2>
            <p class="text-xs text-zinc-500">{{ video.year || '未知年份' }} · {{ video.type_name || '未分类' }}</p>
          </div>
        </RouterLink>
      </div>
    </div>

    <div v-else class="surface rounded-lg p-8">
      <div class="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-md bg-primary-50 text-primary-700">
          <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="text-xl" aria-hidden="true" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-zinc-900">暂无搜索结果</h1>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 搜索首页
 * 功能描述：提供视频关键词搜索入口和资源站结果标签容器
 */
import { onMounted, ref } from 'vue'

import { useSearchStore } from '@/stores/search'

const searchStore = useSearchStore()
const draftKeyword = ref('')

onMounted(() => {
  searchStore.restoreCache()
  draftKeyword.value = searchStore.keyword
})

const handleSearch = async () => {
  searchStore.setKeyword(draftKeyword.value)
  try {
    await searchStore.searchAcrossSites()
  } catch {
    // 错误状态由 Store 统一维护
  }
}

const buildDetailLink = (video) => ({
  name: 'VideoDetail',
  params: {
    siteId: searchStore.activeSiteId,
    vodId: video.id
  },
  query: {
    keyword: searchStore.keyword,
    page: searchStore.activeResult?.pagination?.page || 1
  }
})
</script>
