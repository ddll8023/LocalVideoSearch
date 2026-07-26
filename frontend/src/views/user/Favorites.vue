<template>
  <section class="space-y-6">
    <header class="surface flex items-center justify-between rounded-lg p-5">
      <div class="flex items-center gap-2">
        <font-awesome-icon :icon="['fas', 'heart']" class="text-red-500" aria-hidden="true" />
        <h1 class="text-lg font-semibold text-zinc-900">我的收藏</h1>
      </div>
      <span class="text-sm text-zinc-400">共 {{ pagination.total }} 部</span>
    </header>

    <AppAlert v-if="error" :message="error" show-retry @retry="loadFavorites" />

    <AppLoadingState v-if="loading && favorites.length === 0" text="正在加载收藏" />

    <section v-if="favorites.length > 0" class="surface space-y-4 rounded-lg p-4">
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="favorite in favorites" :key="favorite.id" class="group relative">
          <RouterLink
            class="block overflow-hidden rounded-md border border-zinc-200 bg-white transition duration-200 hover:border-primary-500 hover:shadow-lift hover:-translate-y-0.5"
            :to="buildDetailLink(favorite)"
          >
            <div class="aspect-[4/5] bg-zinc-100">
              <img
                v-if="favorite.thumbnail && !failedImages[favorite.id]"
                class="h-full w-full object-cover"
                :src="favorite.thumbnail"
                :alt="favorite.title"
                loading="lazy"
                @error="failedImages[favorite.id] = true"
              />
              <div v-else class="flex h-full items-center justify-center text-zinc-300">
                <font-awesome-icon :icon="['fas', 'film']" class="text-3xl" aria-hidden="true" />
              </div>
            </div>
            <div class="space-y-1 p-2">
              <h2 class="line-clamp-2 text-sm font-semibold text-zinc-900 group-hover:text-primary-700">
                {{ favorite.title }}
              </h2>
              <p class="truncate text-xs text-zinc-500">
                {{ favorite.type_name || '未分类' }}
                <span v-if="favorite.remarks"> · {{ favorite.remarks }}</span>
              </p>
            </div>
          </RouterLink>
          <button
            type="button"
            class="absolute right-1.5 top-1.5 hidden h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-red-600 group-hover:flex"
            aria-label="取消收藏"
            title="取消收藏"
            @click.prevent="handleRemove(favorite)"
          >
            <font-awesome-icon :icon="['fas', 'xmark']" aria-hidden="true" />
          </button>
        </div>
      </div>

      <AppPagination
        label="收藏"
        :loading="loading"
        :pagination="pagination"
        @page-change="changePage"
      />
    </section>

    <AppEmptyState
      v-if="!loading && favorites.length === 0"
      :icon="['fas', 'heart']"
      title="还没有收藏任何视频"
      description="在视频详情页点击收藏按钮，就能在这里快速找到它们"
    />
  </section>
</template>

<script setup>
/**
 * 收藏页
 * 功能描述：分页展示收藏的视频，支持取消收藏与跳转详情
 * 依赖组件：AppAlert、AppEmptyState、AppLoadingState、AppPagination
 */
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useToastStore } from '@/stores/toast'

import { getFavorites, removeFavorite } from '@/api/favorites'

import AppAlert from '@/components/base/AppAlert.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import AppLoadingState from '@/components/base/AppLoadingState.vue'
import AppPagination from '@/components/base/AppPagination.vue'

const PAGE_SIZE = 20

const toastStore = useToastStore()

const favorites = ref([])
const pagination = ref({ page: 1, page_size: PAGE_SIZE, total: 0, total_pages: 0 })
const loading = ref(false)
const error = ref('')
const failedImages = reactive({})

onMounted(() => {
  loadFavorites()
})

const loadFavorites = async (page = pagination.value.page) => {
  loading.value = true
  error.value = ''
  try {
    const response = await getFavorites({ page, pageSize: PAGE_SIZE })
    favorites.value = response.data?.lists || []
    pagination.value = response.data?.pagination || pagination.value
  } catch (err) {
    error.value = err.message || '加载收藏失败'
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  if (page < 1) return
  loadFavorites(page)
}

const handleRemove = async (favorite) => {
  try {
    await removeFavorite(favorite.id)
    toastStore.success('已取消收藏')
    const isLastItemOnPage = favorites.value.length === 1 && pagination.value.page > 1
    loadFavorites(isLastItemOnPage ? pagination.value.page - 1 : pagination.value.page)
  } catch (err) {
    toastStore.error(err.message || '取消收藏失败')
  }
}

const buildDetailLink = (favorite) => ({
  name: 'VideoDetail',
  params: {
    siteId: favorite.site_id,
    vodId: favorite.vod_id
  },
  query: {
    keyword: favorite.keyword,
    page: 1
  }
})
</script>
