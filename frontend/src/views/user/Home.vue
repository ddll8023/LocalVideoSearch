<template>
  <section class="space-y-6">
    <header class="surface rounded-lg p-5">
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
          <font-awesome-icon
            :icon="searchStore.loading ? ['fas', 'spinner'] : ['fas', 'magnifying-glass']"
            :class="searchStore.loading ? 'fa-spin' : ''"
            aria-hidden="true"
          />
          <span>{{ searchStore.loading ? '搜索中' : '搜索' }}</span>
        </button>
      </form>
    </header>

    <div v-if="searchStore.error" class="surface rounded-lg border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="mr-2" aria-hidden="true" />
      {{ searchStore.error }}
    </div>

    <section v-if="searchStore.resultSites.length > 0" class="surface overflow-hidden rounded-lg">
      <header class="border-b border-zinc-200 px-4 py-3">
        <div class="flex gap-2 overflow-x-auto">
          <button
            v-for="result in searchStore.resultSites"
            :key="result.site.site_id"
            class="toolbar-button h-9 shrink-0"
            :class="searchStore.activeSiteId === result.site.site_id ? 'border-primary-600 text-primary-700' : ''"
            type="button"
            @click="searchStore.setActiveSite(result.site.site_id)"
          >
            <font-awesome-icon :icon="['fas', 'server']" aria-hidden="true" />
            <span>{{ result.site.name }}</span>
            <span class="text-xs text-zinc-400">{{ result.pagination.total }}</span>
          </button>
        </div>
      </header>

      <div v-if="activeResult" class="space-y-4 p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-zinc-500">
            第 {{ activeResult.pagination.page }} / {{ displayTotalPages }} 页，
            共 {{ activeResult.pagination.total }} 条
            <span v-if="activeResult.elapsedMs">，耗时 {{ formatDuration(activeResult.elapsedMs) }}</span>
          </div>
          <div v-if="activeResult.filterStats" class="text-xs text-zinc-500">
            原始 {{ activeResult.filterStats.original_count }}，
            过滤 {{ activeResult.filterStats.filtered_count }}，
            展示 {{ activeResult.filterStats.display_count }}
          </div>
        </div>

        <div v-if="activeResult.lists.length > 0" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RouterLink
            v-for="video in activeResult.lists"
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
              <div v-else class="flex h-full items-center justify-center text-zinc-300">
                <font-awesome-icon :icon="['fas', 'film']" class="text-3xl" aria-hidden="true" />
              </div>
            </div>
            <div class="space-y-2 p-3">
              <h2 class="line-clamp-2 text-sm font-semibold text-zinc-900 group-hover:text-primary-700">
                {{ video.title }}
              </h2>
              <p class="truncate text-xs text-zinc-500">
                {{ video.year || '未知年份' }} · {{ video.type_name || '未分类' }}
              </p>
              <p class="truncate text-xs text-zinc-400">{{ video.status || video.actor || '暂无更多信息' }}</p>
            </div>
          </RouterLink>
        </div>

        <div v-else class="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
          当前资源站没有搜索结果
        </div>

        <footer class="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            class="toolbar-button"
            type="button"
            :disabled="!canPrevPage || searchStore.loading"
            @click="changePage(activeResult.pagination.page - 1)"
          >
            <font-awesome-icon :icon="['fas', 'chevron-left']" aria-hidden="true" />
            <span>上一页</span>
          </button>
          <span class="text-center text-sm text-zinc-500">
            {{ activeResult.site.name }} · 每页 {{ activeResult.pagination.page_size }}
          </span>
          <button
            class="toolbar-button"
            type="button"
            :disabled="!canNextPage || searchStore.loading"
            @click="changePage(activeResult.pagination.page + 1)"
          >
            <span>下一页</span>
            <font-awesome-icon :icon="['fas', 'chevron-right']" aria-hidden="true" />
          </button>
        </footer>
      </div>
    </section>

    <section v-if="searchStore.failedResults.length > 0" class="surface rounded-lg p-4">
      <h2 class="mb-3 text-sm font-semibold text-zinc-900">搜索失败站点</h2>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in searchStore.failedResults"
          :key="item.site.site_id"
          class="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ item.site.name }}：{{ item.message }}
        </div>
      </div>
    </section>

    <section v-if="showEmptyState" class="surface rounded-lg p-8">
      <div class="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-md bg-primary-50 text-primary-700">
          <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="text-xl" aria-hidden="true" />
        </div>
        <div>
          <h1 class="text-xl font-semibold text-zinc-900">{{ emptyTitle }}</h1>
          <p class="mt-2 text-sm text-zinc-500">{{ emptyDescription }}</p>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
/**
 * 搜索首页
 * 功能描述：提供多资源站视频搜索、结果 Tab、分页和本地缓存恢复
 */
import { computed, onMounted, ref } from 'vue'

import { useSearchStore } from '@/stores/search'
import { formatDuration } from '@/utils/format'

const searchStore = useSearchStore()
const draftKeyword = ref('')

const activeResult = computed(() => searchStore.activeResult)
const displayTotalPages = computed(() => activeResult.value?.pagination?.total_pages || 1)
const canPrevPage = computed(() => Number(activeResult.value?.pagination?.page || 1) > 1)
const canNextPage = computed(() => {
  const pagination = activeResult.value?.pagination
  if (!pagination) return false
  return Number(pagination.page) < Number(pagination.total_pages || 0)
})
const showEmptyState = computed(
  () => !searchStore.loading && (!searchStore.hasSearched || searchStore.resultSites.length === 0)
)
const emptyTitle = computed(() => (searchStore.hasSearched ? '暂无匹配结果' : '搜索视频资源'))
const emptyDescription = computed(() =>
  searchStore.hasSearched ? '可以更换关键词或启用更多资源站后重试' : '输入关键词后会按启用资源站并发搜索'
)

onMounted(() => {
  searchStore.restoreCache()
  draftKeyword.value = searchStore.keyword
})

const handleSearch = async () => {
  searchStore.setKeyword(draftKeyword.value)
  try {
    await searchStore.searchAcrossSites()
  } catch {
    // 错误状态由 Store 统一维护。
  }
}

const changePage = async (page) => {
  if (!activeResult.value || page < 1) return
  try {
    await searchStore.searchSitePage({
      siteId: searchStore.activeSiteId,
      page,
      pageSize: activeResult.value.pagination.page_size
    })
  } catch {
    // 错误状态由 Store 统一维护。
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
    page: activeResult.value?.pagination?.page || 1
  }
})
</script>
