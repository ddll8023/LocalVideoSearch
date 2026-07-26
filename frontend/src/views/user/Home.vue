<template>
  <section class="space-y-6">
    <header class="surface rounded-lg p-5">
      <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="handleSearch">
        <label class="sr-only" for="keyword">关键词</label>
        <div class="relative flex-1">
          <input
            id="keyword"
            v-model="draftKeyword"
            class="field-input w-full"
            type="search"
            autocomplete="off"
            placeholder="输入影片、剧集或演员"
            @focus="handleHistoryFocus"
            @blur="handleHistoryBlur"
          />

          <div
            v-if="showHistory && historyList.length > 0"
            class="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg"
          >
            <button
              v-for="item in historyList"
              :key="item.id"
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
              @mousedown.prevent
              @click="applyHistory(item)"
            >
              <font-awesome-icon :icon="['fas', 'clock-rotate-left']" class="text-zinc-300" aria-hidden="true" />
              <span class="flex-1 truncate">{{ item.keyword }}</span>
              <span class="shrink-0 text-xs text-zinc-400">{{ item.search_count }} 次</span>
              <span
                class="shrink-0 cursor-pointer p-1 text-zinc-300 transition hover:text-red-500"
                role="button"
                aria-label="删除该历史"
                @mousedown.prevent
                @click.stop="removeHistory(item)"
              >
                <font-awesome-icon :icon="['fas', 'xmark']" aria-hidden="true" />
              </span>
            </button>
            <div class="border-t border-zinc-100 px-3 py-1.5 text-right">
              <button
                type="button"
                class="text-xs text-zinc-400 transition hover:text-red-500"
                @mousedown.prevent
                @click="clearAllHistory"
              >
                清空搜索历史
              </button>
            </div>
          </div>
        </div>

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

    <section v-if="playRecords.length > 0" class="surface rounded-lg p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <font-awesome-icon :icon="['fas', 'play']" class="text-primary-700" aria-hidden="true" />
          <h2 class="text-sm font-semibold text-zinc-900">继续观看</h2>
        </div>
        <span class="text-xs text-zinc-400">{{ playRecords.length }} 条记录</span>
      </div>
      <div class="flex gap-3 overflow-x-auto pb-1">
        <div
          v-for="record in playRecords"
          :key="record.id"
          class="group relative w-40 shrink-0"
        >
          <RouterLink :to="buildRecordLink(record)" class="block">
            <div class="aspect-video overflow-hidden rounded-md bg-zinc-100">
              <img
                v-if="record.thumbnail && !failedRecordImages[record.id]"
                class="h-full w-full object-cover transition group-hover:scale-105"
                :src="record.thumbnail"
                :alt="record.title"
                loading="lazy"
                @error="failedRecordImages[record.id] = true"
              />
              <div v-else class="flex h-full items-center justify-center text-zinc-300">
                <font-awesome-icon :icon="['fas', 'film']" class="text-2xl" aria-hidden="true" />
              </div>
            </div>
            <p class="mt-1.5 truncate text-sm font-medium text-zinc-800 group-hover:text-primary-700">
              {{ record.title }}
            </p>
            <p class="truncate text-xs text-zinc-400">
              {{ record.episode_name || '第1集' }} · 看至 {{ formatPlayTime(record.position_seconds) }}
            </p>
          </RouterLink>
          <button
            type="button"
            class="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white transition hover:bg-black/80 group-hover:flex"
            aria-label="删除播放记录"
            @click.prevent="removeRecord(record)"
          >
            <font-awesome-icon :icon="['fas', 'xmark']" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>

    <AppAlert
      v-if="searchStore.error"
      :message="searchStore.error"
      show-retry
      @retry="handleSearch"
    />

    <div
      v-if="searchStore.searchingCount > 0"
      class="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-4 py-2.5 text-sm text-primary-700"
    >
      <font-awesome-icon :icon="['fas', 'spinner']" class="fa-spin" aria-hidden="true" />
      <span>正在搜索 {{ searchStore.searchingCount }} / {{ siteTabs.length }} 个资源站…</span>
    </div>

    <section v-if="siteTabs.length > 0" class="surface overflow-hidden rounded-lg">
      <div class="flex">
        <aside class="w-48 shrink-0 space-y-1 overflow-y-auto border-r border-zinc-200 p-3">
          <button
            v-for="tab in siteTabs"
            :key="tab.siteId"
            type="button"
            class="site-btn"
            :class="tabClass(tab)"
            :title="tab.status === 'failed' ? `${tab.message}（点击重试）` : tab.name"
            :disabled="tab.status === 'loading'"
            @click="handleTabClick(tab)"
          >
            <span class="truncate">{{ tab.name }}</span>
            <span class="ml-2 flex shrink-0 items-center text-xs">
              <font-awesome-icon
                v-if="tab.status === 'loading'"
                :icon="['fas', 'spinner']"
                class="fa-spin opacity-60"
                aria-hidden="true"
              />
              <font-awesome-icon
                v-else-if="tab.status === 'failed'"
                :icon="['fas', 'rotate']"
                class="text-red-500"
                aria-hidden="true"
              />
              <span v-else class="opacity-60">{{ tab.total }}</span>
            </span>
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

            <AppEmptyState
              v-else
              :framed="false"
              :icon="['fas', 'magnifying-glass']"
              title="暂无可展示的站点结果"
              description="左侧红色站点可点击重试，搜索中的站点完成后会自动展示"
            />
          </transition>
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
 * 功能描述：多资源站视频搜索，站点级搜索状态可视化、失败重试、搜索历史下拉、继续观看和本地缓存恢复
 * 依赖组件：AppAlert、AppEmptyState、AppPagination、VideoResultCard
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useResourceStore } from '@/stores/resources'
import { useSearchStore } from '@/stores/search'
import { useToastStore } from '@/stores/toast'
import { formatDuration } from '@/utils/format'

import { clearSearchHistory, deleteSearchHistory, getSearchHistory } from '@/api/history'
import { deletePlayRecord, getPlayRecords } from '@/api/playRecords'

import AppAlert from '@/components/base/AppAlert.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import AppPagination from '@/components/base/AppPagination.vue'
import VideoResultCard from '@/components/business/VideoResultCard.vue'

const searchStore = useSearchStore()
const resourceStore = useResourceStore()
const toastStore = useToastStore()
const draftKeyword = ref('')

const historyList = ref([])
const showHistory = ref(false)
const playRecords = ref([])
const failedRecordImages = reactive({})

const activeResult = computed(() => searchStore.activeResult)
const totalPages = computed(() => Math.max(Number(activeResult.value?.pagination?.total_pages || 1), 1))

const siteTabs = computed(() =>
  Object.keys(searchStore.statusMap).map((siteId) => {
    const result = searchStore.resultMap[siteId]
    const failure = searchStore.failureMap[siteId]
    const site =
      result?.site || failure?.site || resourceStore.sites.find((item) => item.site_id === siteId)
    return {
      siteId,
      name: site?.name || siteId,
      status: searchStore.statusMap[siteId],
      total: result?.pagination?.total ?? 0,
      message: failure?.message || ''
    }
  })
)

const showEmptyState = computed(
  () => !searchStore.loading && siteTabs.value.length === 0
)
const emptyTitle = computed(() => (searchStore.hasSearched ? '暂无匹配结果' : '搜索视频资源'))
const emptyDescription = computed(() =>
  searchStore.hasSearched ? '可以更换关键词或启用更多资源站后重试' : '输入关键词后会按启用资源站并发搜索'
)

onMounted(() => {
  searchStore.restoreCache()
  draftKeyword.value = searchStore.keyword
  loadPlayRecords()
})

/**
 * 发起多站点搜索
 */
const handleSearch = async () => {
  showHistory.value = false
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

const tabClass = (tab) => {
  if (searchStore.activeSiteId === tab.siteId) return 'site-btn-active'
  if (tab.status === 'failed') return 'site-btn-inactive !text-red-600'
  return 'site-btn-inactive'
}

const handleTabClick = (tab) => {
  if (tab.status === 'loading') return
  if (tab.status === 'failed') {
    searchStore.retrySite(tab.siteId)
    return
  }
  searchStore.setActiveSite(tab.siteId)
}

/**
 * 搜索历史交互
 */
const handleHistoryFocus = () => {
  showHistory.value = true
  fetchHistory()
}

const handleHistoryBlur = () => {
  setTimeout(() => {
    showHistory.value = false
  }, 150)
}

const fetchHistory = async () => {
  try {
    const response = await getSearchHistory(10)
    historyList.value = response.data?.lists || []
  } catch {
    // 历史加载失败不影响搜索主流程。
  }
}

const applyHistory = (item) => {
  draftKeyword.value = item.keyword
  showHistory.value = false
  handleSearch()
}

const removeHistory = async (item) => {
  try {
    await deleteSearchHistory(item.id)
    historyList.value = historyList.value.filter((entry) => entry.id !== item.id)
  } catch (err) {
    toastStore.error(err.message || '删除失败')
  }
}

const clearAllHistory = async () => {
  try {
    await clearSearchHistory()
    historyList.value = []
    showHistory.value = false
    toastStore.success('搜索历史已清空')
  } catch (err) {
    toastStore.error(err.message || '清空失败')
  }
}

/**
 * 继续观看
 */
const loadPlayRecords = async () => {
  try {
    const response = await getPlayRecords({ page: 1, pageSize: 10 })
    playRecords.value = response.data?.lists || []
  } catch {
    // 播放记录加载失败不影响搜索主流程。
  }
}

const removeRecord = async (record) => {
  try {
    await deletePlayRecord(record.id)
    playRecords.value = playRecords.value.filter((entry) => entry.id !== record.id)
    toastStore.success('播放记录已删除')
  } catch (err) {
    toastStore.error(err.message || '删除失败')
  }
}

const buildRecordLink = (record) => ({
  name: 'VideoPlayer',
  params: {
    siteId: record.site_id,
    vodId: record.vod_id
  },
  query: {
    keyword: record.keyword,
    line: record.line_name,
    episode: record.episode_index
  }
})

const formatPlayTime = (seconds) => {
  const total = Math.max(Math.floor(seconds || 0), 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (value) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`
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
