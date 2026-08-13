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
        <button class="toolbar-button" type="button" @click="toggleAutoRefresh">
          <font-awesome-icon :icon="['fas', autoRefreshPaused ? 'play' : 'pause']" aria-hidden="true" />
          <span>{{ autoRefreshPaused ? '恢复刷新' : '暂停刷新' }}</span>
        </button>
        <button class="toolbar-button" type="button" :disabled="loading" @click="handleManualRefresh">
          <font-awesome-icon :icon="['fas', 'rotate']" aria-hidden="true" />
          <span>刷新</span>
        </button>
      </div>
    </header>

    <AppAlert v-if="error" :message="error" show-retry @retry="loadMonitorData" />

    <div class="stagger-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <section class="surface surface-reveal rounded-lg p-5">
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-lg font-semibold text-zinc-900">搜索趋势</h1>
          <span class="text-xs text-zinc-500">每小时聚合</span>
        </div>
        <div v-show="trendItems.length" ref="trendChartRef" class="mt-5 h-64 w-full" />
        <AppEmptyState v-if="!trendItems.length" title="暂无趋势数据" description="产生请求日志后会显示搜索趋势。" :framed="false" />
      </section>

      <section class="surface surface-reveal rounded-lg p-5" style="animation-delay: 80ms">
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

      <section class="surface surface-reveal rounded-lg p-5" style="animation-delay: 160ms">
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

      <section class="surface surface-reveal rounded-lg p-5" style="animation-delay: 240ms">
        <h1 class="text-lg font-semibold text-zinc-900">热门关键词</h1>
        <div v-show="keywordItems.length" ref="keywordChartRef" class="mt-5 h-80 w-full" />
        <AppEmptyState v-if="!keywordItems.length" title="暂无关键词数据" description="搜索请求日志中包含关键词后会显示排名。" :framed="false" />
      </section>
    </div>
  </section>
</template>

<script setup>
/**
 * 系统监控页
 * 功能描述：展示后端监控聚合摘要、ECharts 趋势/关键词图表、站点性能和系统健康
 * 依赖组件：AppAlert、AppEmptyState、AppLoadingState
 */
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'

import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

import { useToastStore } from '@/stores/toast'
import {
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

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const toast = useToastStore()

const loading = ref(false)
const error = ref('')
const dashboard = ref({})
const searchStats = ref({})
const health = ref({})
const realTime = ref({})
const sitePerformance = ref({})
const trends = ref({})
const hotKeywords = ref({})
const hours = ref(24)
const hasLoaded = ref(false)
const autoRefreshPaused = ref(false)
const trendChartRef = ref(null)
const keywordChartRef = ref(null)
let refreshTimer = null
let trendChart = null
let keywordChart = null

const summaryItems = computed(() => [
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
      searchResponse,
      healthResponse,
      realTimeResponse,
      siteResponse,
      trendResponse,
      keywordResponse
    ] = await Promise.all([
      getDashboardOverview(),
      getSearchStats({ hours: hours.value }),
      getSystemHealth({ hours: hours.value }),
      getRealTimeSummary(),
      getSitePerformance({ hours: hours.value }),
      getTrends({ hours: hours.value }),
      getHotKeywords({ hours: hours.value, limit: 10 })
    ])
    dashboard.value = response.data || {}
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

/**
 * 手动刷新：成功后弹出提示
 */
const handleManualRefresh = async () => {
  await loadMonitorData()
  if (!error.value) {
    toast.success('监控数据已刷新')
  }
}

/**
 * 暂停/恢复 30 秒自动刷新
 */
const toggleAutoRefresh = () => {
  autoRefreshPaused.value = !autoRefreshPaused.value
  if (autoRefreshPaused.value) {
    stopAutoRefresh()
  } else {
    startAutoRefresh()
  }
}

const startAutoRefresh = () => {
  if (refreshTimer) return
  refreshTimer = window.setInterval(loadMonitorData, 30000)
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
}

/**
 * 更新搜索趋势柱状图（X 轴使用后端桶的 label 字段）
 */
const updateTrendChart = async () => {
  if (!trendItems.value.length) return
  await nextTick()
  if (!trendChart && trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (!trendChart) return
  trendChart.resize()
  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const point = params[0]
        return `${point.name}<br/>搜索 ${point.value} 次`
      }
    },
    grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: trendItems.value.map((item) => item.label),
      axisLine: { lineStyle: { color: '#e4e4e7' } },
      axisTick: { show: false },
      axisLabel: { color: '#71717a', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#f4f4f5' } },
      axisLabel: { color: '#71717a', fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        data: trendItems.value.map((item) => item.search_count),
        barMaxWidth: 28,
        itemStyle: { color: '#78959a', borderRadius: [4, 4, 0, 0] }
      }
    ]
  })
}

/**
 * 更新热门关键词横向条形图（次数最多的关键词显示在顶部）
 */
const updateKeywordChart = async () => {
  if (!keywordItems.value.length) return
  await nextTick()
  if (!keywordChart && keywordChartRef.value) {
    keywordChart = echarts.init(keywordChartRef.value)
  }
  if (!keywordChart) return
  const items = [...keywordItems.value].reverse()
  keywordChart.resize()
  keywordChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const point = params[0]
        return `${point.name}<br/>${point.value} 次`
      }
    },
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#f4f4f5' } },
      axisLabel: { color: '#71717a', fontSize: 11 }
    },
    yAxis: {
      type: 'category',
      data: items.map((item) => item.keyword),
      axisLine: { lineStyle: { color: '#e4e4e7' } },
      axisTick: { show: false },
      axisLabel: { color: '#3f3f46', fontSize: 12, width: 96, overflow: 'truncate' }
    },
    series: [
      {
        type: 'bar',
        data: items.map((item) => item.count),
        barMaxWidth: 16,
        itemStyle: { color: '#9c8a66', borderRadius: [0, 4, 4, 0] }
      }
    ]
  })
}

const handleChartResize = () => {
  trendChart?.resize()
  keywordChart?.resize()
}

watch(trendItems, updateTrendChart)
watch(keywordItems, updateKeywordChart)

onMounted(() => {
  loadMonitorData()
  startAutoRefresh()
  updateTrendChart()
  updateKeywordChart()
  window.addEventListener('resize', handleChartResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleChartResize)
  trendChart?.dispose()
  keywordChart?.dispose()
  trendChart = null
  keywordChart = null
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>
