<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-900">系统监控</h1>
        <p class="mt-1 text-sm text-zinc-500">实时摘要和关键运行指标。</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model.number="hours" class="field-input w-32" @change="loadMonitorData">
          <option :value="6">6 小时</option>
          <option :value="24">24 小时</option>
          <option :value="72">72 小时</option>
        </select>
        <button class="toolbar-button" type="button" :disabled="loading" @click="loadMonitorData">
          <font-awesome-icon :icon="['fas', 'rotate']" aria-hidden="true" />
          <span>刷新</span>
        </button>
      </div>
    </header>

    <AppAlert v-if="error" :message="error" show-retry @retry="loadMonitorData" />

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="item in summaryItems" :key="item.label" class="surface rounded-lg p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-zinc-500">{{ item.label }}</p>
          <font-awesome-icon :icon="item.icon" class="text-primary-700" aria-hidden="true" />
        </div>
        <p class="mt-2 text-2xl font-semibold text-zinc-900">{{ item.value }}</p>
        <p v-if="item.description" class="mt-1 text-xs text-zinc-500">{{ item.description }}</p>
      </div>
    </div>

    <AppLoadingState v-if="loading && !hasLoaded" text="监控数据加载中" />

    <div v-else class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <section class="surface rounded-lg p-5">
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-lg font-semibold text-zinc-900">搜索趋势</h1>
          <span class="text-xs text-zinc-500">每小时聚合</span>
        </div>
        <div v-if="trendItems.length" class="mt-5 flex h-64 items-end gap-2 overflow-x-auto pb-2">
          <div v-for="item in trendItems" :key="item.label" class="flex min-w-12 flex-1 flex-col items-center gap-2">
            <div class="flex h-48 w-full items-end rounded bg-zinc-100">
              <div
                class="w-full rounded bg-primary-600 transition"
                :style="{ height: `${getTrendHeight(item.search_count)}%` }"
                :title="`${item.label}：${item.search_count} 次`"
              />
            </div>
            <span class="w-16 truncate text-center text-[11px] text-zinc-500">{{ item.label.slice(6) }}</span>
          </div>
        </div>
        <AppEmptyState v-else title="暂无趋势数据" description="产生请求日志后会显示搜索趋势。" :framed="false" />
      </section>

      <section class="surface rounded-lg p-5">
        <h1 class="text-lg font-semibold text-zinc-900">系统健康</h1>
        <div class="mt-5 space-y-4">
          <div class="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 p-4">
            <span class="text-sm text-zinc-500">状态</span>
            <span :class="healthStatusClass">{{ healthStatusLabel }}</span>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-md border border-zinc-100 bg-zinc-50 p-4">
              <p class="text-zinc-500">错误数</p>
              <p class="mt-2 text-xl font-semibold text-zinc-900">{{ health.error_count ?? 0 }}</p>
            </div>
            <div class="rounded-md border border-zinc-100 bg-zinc-50 p-4">
              <p class="text-zinc-500">警告数</p>
              <p class="mt-2 text-xl font-semibold text-zinc-900">{{ health.warning_count ?? 0 }}</p>
            </div>
          </div>
          <p class="text-xs text-zinc-500">最新日志：{{ realTime.latest_log_time || health.latest_log_time || '-' }}</p>
        </div>
      </section>

      <section class="surface rounded-lg p-5">
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-lg font-semibold text-zinc-900">站点性能</h1>
          <span class="text-xs text-zinc-500">按请求数排序</span>
        </div>
        <div v-if="siteItems.length" class="mt-5 overflow-hidden rounded-md border border-zinc-100">
          <div class="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500">
            <span>站点</span>
            <span>请求</span>
            <span>成功率</span>
            <span>平均耗时</span>
          </div>
          <div v-for="item in siteItems" :key="item.site" class="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] border-t border-zinc-100 px-4 py-3 text-sm text-zinc-700">
            <span class="truncate pr-3 text-zinc-900">{{ item.site }}</span>
            <span>{{ item.request_count }}</span>
            <span>{{ item.success_rate }}%</span>
            <span>{{ item.average_response_time }}ms</span>
          </div>
        </div>
        <AppEmptyState v-else title="暂无站点数据" description="完成资源站请求后会显示性能统计。" :framed="false" />
      </section>

      <section class="surface rounded-lg p-5">
        <h1 class="text-lg font-semibold text-zinc-900">热门关键词</h1>
        <div v-if="keywordItems.length" class="mt-5 space-y-3">
          <div v-for="item in keywordItems" :key="item.keyword" class="space-y-2">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="truncate text-zinc-900">{{ item.keyword }}</span>
              <span class="text-zinc-500">{{ item.count }}</span>
            </div>
            <div class="h-2 rounded bg-zinc-100">
              <div class="h-2 rounded bg-amber-500" :style="{ width: `${getKeywordWidth(item.count)}%` }" />
            </div>
          </div>
        </div>
        <AppEmptyState v-else title="暂无关键词数据" description="搜索请求日志中包含关键词后会显示排名。" :framed="false" />
      </section>
    </div>
  </section>
</template>

<script setup>
/**
 * 系统监控页
 * 功能描述：展示后端监控聚合摘要、趋势、站点性能和热门关键词
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
  getActiveUsers,
  getDashboardOverview,
  getHotKeywords,
  getRealTimeSummary,
  getSearchStats,
  getSitePerformance,
  getSystemHealth,
  getTrends
} from '@/api/monitor'
import AppAlert from '@/components/base/AppAlert.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import AppLoadingState from '@/components/base/AppLoadingState.vue'

const loading = ref(false)
const error = ref('')
const dashboard = ref({})
const activeUsers = ref({})
const searchStats = ref({})
const health = ref({})
const realTime = ref({})
const sitePerformance = ref({})
const trends = ref({})
const hotKeywords = ref({})
const hours = ref(24)
const hasLoaded = ref(false)
let refreshTimer = null

const summaryItems = computed(() => [
  {
    label: '活跃用户',
    value: activeUsers.value.active_users ?? dashboard.value.active_users ?? 0,
    description: `${activeUsers.value.minutes ?? 30} 分钟活动`,
    icon: ['fas', 'circle-check']
  },
  {
    label: '搜索次数',
    value: searchStats.value.total_searches ?? dashboard.value.search_count ?? 0,
    description: `${hours.value} 小时窗口`,
    icon: ['fas', 'magnifying-glass']
  },
  {
    label: '成功率',
    value: `${searchStats.value.success_rate ?? dashboard.value.success_rate ?? 0}%`,
    description: '已完成请求',
    icon: ['fas', 'chart-line']
  },
  {
    label: '平均响应',
    value: `${searchStats.value.average_response_time ?? dashboard.value.average_response_time ?? 0}ms`,
    description: '资源站请求耗时',
    icon: ['fas', 'server']
  }
])

const trendItems = computed(() => trends.value.lists || [])
const siteItems = computed(() => sitePerformance.value.lists || [])
const keywordItems = computed(() => hotKeywords.value.lists || [])
const maxTrendCount = computed(() => Math.max(...trendItems.value.map((item) => item.search_count), 1))
const maxKeywordCount = computed(() => Math.max(...keywordItems.value.map((item) => item.count), 1))

const healthStatusLabel = computed(() => {
  const status = health.value.status || 'healthy'
  return {
    healthy: '正常',
    warning: '需关注',
    error: '异常'
  }[status]
})

const healthStatusClass = computed(() => {
  const status = health.value.status || 'healthy'
  return {
    healthy: 'rounded bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700',
    warning: 'rounded bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700',
    error: 'rounded bg-red-50 px-3 py-1 text-sm font-semibold text-red-700'
  }[status]
})

const loadMonitorData = async () => {
  loading.value = true
  error.value = ''
  try {
    const [
      response,
      activeResponse,
      searchResponse,
      healthResponse,
      realTimeResponse,
      siteResponse,
      trendResponse,
      keywordResponse
    ] = await Promise.all([
      getDashboardOverview(),
      getActiveUsers({ minutes: 30 }),
      getSearchStats({ hours: hours.value }),
      getSystemHealth({ hours: hours.value }),
      getRealTimeSummary(),
      getSitePerformance({ hours: hours.value }),
      getTrends({ hours: hours.value }),
      getHotKeywords({ hours: hours.value, limit: 10 })
    ])
    dashboard.value = response.data || {}
    activeUsers.value = activeResponse.data || {}
    searchStats.value = searchResponse.data || {}
    health.value = healthResponse.data || {}
    realTime.value = realTimeResponse.data || {}
    sitePerformance.value = siteResponse.data || {}
    trends.value = trendResponse.data || {}
    hotKeywords.value = keywordResponse.data || {}
    hasLoaded.value = true
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

const getTrendHeight = (count) => Math.max(4, Math.round((count / maxTrendCount.value) * 100))
const getKeywordWidth = (count) => Math.max(6, Math.round((count / maxKeywordCount.value) * 100))

onMounted(() => {
  loadMonitorData()
  refreshTimer = window.setInterval(loadMonitorData, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
})
</script>
