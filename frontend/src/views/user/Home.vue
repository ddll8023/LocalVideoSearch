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

    <AppAlert v-if="searchStore.error" :message="searchStore.error" />

    <AppLoadingState
      v-if="searchStore.loading && searchStore.resultSites.length === 0"
      text="正在并发搜索已启用资源站"
    />

    <section v-if="searchStore.resultSites.length > 0" class="surface overflow-hidden rounded-lg">
      <div class="flex">
        <aside class="w-44 shrink-0 border-r border-zinc-200 overflow-y-auto p-3 space-y-1">
          <button
            v-for="result in searchStore.resultSites"
            :key="result.site.site_id"
            type="button"
            class="site-btn"
            :class="searchStore.activeSiteId === result.site.site_id ? 'site-btn-active' : 'site-btn-inactive'"
            @click="searchStore.setActiveSite(result.site.site_id)"
          >
            <span class="truncate">{{ result.site.name }}</span>
            <span class="ml-2 shrink-0 text-xs opacity-60">{{ result.pagination.total }}</span>
          </button>
        </aside>

        <div class="min-w-0 flex-1">
          <transition name="tab-fade" mode="out-in">
            <div v-if="activeResult" :key="searchStore.activeSiteId" class="space-y-4 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="text-sm text-zinc-500">
                  第 {{ activeResult.pagination.page }} / {{ totalPages }} 页，
                  共 {{ activeResult.pagination.total }} 条
                  <span v-if="activeResult.elapsedMs">，耗时 {{ formatDuration(activeResult.elapsedMs) }}</span>
                </div>
                <div v-if="activeResult.filterStats" class="text-xs text-zinc-500">
                  原始 {{ activeResult.filterStats.original_count }}，
                  过滤 {{ activeResult.filterStats.filtered_count }}，
                  展示 {{ activeResult.filterStats.display_count }}
                </div>
              </div>

              <div v-if="activeResult.lists.length > 0" class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <VideoResultCard
                  v-for="(video, index) in activeResult.lists"
                  :key="video.id"
                  :video="video"
                  :to="buildDetailLink(video)"
                  class="animate-fade-up"
                  :style="{ animationDelay: `${Math.min(index * 40, 400)}ms` }"
                />
              </div>

              <AppEmptyState
                v-else
                :icon="['fas', 'film']"
                :framed="false"
                title="当前资源站没有搜索结果"
                description="可以切换其他资源站或尝试下一页"
              />

              <AppPagination
                :label="activeResult.site.name"
                :loading="searchStore.loading"
                :pagination="activeResult.pagination"
                @page-change="changePage"
              />
            </div>
          </transition>
        </div>
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

    <AppEmptyState
      v-if="showEmptyState"
      :icon="['fas', 'magnifying-glass']"
      :title="emptyTitle"
      :description="emptyDescription"
    />
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

import AppAlert from '@/components/base/AppAlert.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import AppLoadingState from '@/components/base/AppLoadingState.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import VideoResultCard from '@/components/business/VideoResultCard.vue'

const searchStore = useSearchStore()
const draftKeyword = ref('')

const activeResult = computed(() => searchStore.activeResult)
const totalPages = computed(() => Math.max(Number(activeResult.value?.pagination?.total_pages || 1), 1))
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

<style scoped>
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.15s ease;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}
</style>
