<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-900">系统日志</h1>
        <p class="mt-1 text-sm text-zinc-500">系统、请求和操作日志。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="toolbar-button" type="button" :disabled="loading" @click="loadPageData">
          <font-awesome-icon :icon="['fas', 'rotate']" aria-hidden="true" />
          <span>刷新</span>
        </button>
        <button class="toolbar-button text-red-600 hover:border-red-300 hover:text-red-700" type="button" :disabled="loading" @click="handleClearLogs">
          <font-awesome-icon :icon="['fas', 'ban']" aria-hidden="true" />
          <span>清理</span>
        </button>
      </div>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="item in statItems" :key="item.label" class="surface rounded-lg p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-zinc-500">{{ item.label }}</p>
          <font-awesome-icon :icon="item.icon" class="text-primary-700" aria-hidden="true" />
        </div>
        <p class="mt-3 text-2xl font-semibold text-zinc-900">{{ item.value }}</p>
      </div>
    </div>

    <div class="surface rounded-lg p-4">
      <div class="grid gap-3 lg:grid-cols-[150px_150px_180px_180px_1fr_auto]">
        <select v-model="filters.logType" class="field-input">
          <option value="">全部类型</option>
          <option value="system">系统</option>
          <option value="request">请求</option>
          <option value="operation">操作</option>
        </select>
        <select v-model="filters.level" class="field-input">
          <option value="">全部级别</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
        </select>
        <input v-model="filters.startTime" class="field-input" type="datetime-local" />
        <input v-model="filters.endTime" class="field-input" type="datetime-local" />
        <input v-model="filters.keyword" class="field-input" type="search" placeholder="关键词" />
        <button class="primary-button" type="button" :disabled="loading" @click="handleSearch">
          <font-awesome-icon :icon="['fas', 'magnifying-glass']" aria-hidden="true" />
          <span>筛选</span>
        </button>
      </div>
    </div>

    <AppAlert v-if="error" :message="error" show-retry @retry="loadPageData" />

    <AppLoadingState v-if="loading && logs.length === 0" text="日志加载中" />
    <AppEmptyState v-else-if="logs.length === 0" title="暂无日志数据" description="当前筛选条件下没有匹配的日志。" />

    <div v-else class="surface overflow-hidden rounded-lg">
      <button
        v-for="item in logs"
        :key="item.id || `${item.timestamp}-${item.message}`"
        class="block w-full border-b border-zinc-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-zinc-50"
        type="button"
        @click="selectedLog = item"
      >
        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>{{ item.time || item.timestamp }}</span>
          <span :class="levelClassMap[item.level] || 'rounded bg-zinc-100 px-2 py-0.5 text-zinc-600'">
            {{ item.level || '-' }}
          </span>
          <span>{{ typeLabelMap[item.log_type] || item.log_type }}</span>
          <span v-if="item.site">{{ item.site }}</span>
          <span v-if="item.elapsed_ms">{{ item.elapsed_ms }}ms</span>
        </div>
        <p class="mt-2 line-clamp-2 text-sm text-zinc-900">{{ item.message }}</p>
      </button>

      <div class="p-4">
        <AppPagination :pagination="pagination" :loading="loading" label="日志" @page-change="handlePageChange" />
      </div>
    </div>

    <div v-if="selectedLog" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" @click.self="selectedLog = null">
      <section class="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-lift">
        <header class="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <h1 class="text-lg font-semibold text-zinc-900">日志详情</h1>
            <p class="mt-1 text-xs text-zinc-500">{{ selectedLog.time || selectedLog.timestamp }}</p>
          </div>
          <button class="toolbar-button" type="button" @click="selectedLog = null">关闭</button>
        </header>
        <div class="max-h-[60vh] overflow-auto p-5">
          <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div v-for="item in selectedLogFields" :key="item.label" class="rounded-md border border-zinc-100 bg-zinc-50 p-3">
              <dt class="text-xs text-zinc-500">{{ item.label }}</dt>
              <dd class="mt-1 break-words text-zinc-900">{{ item.value }}</dd>
            </div>
          </dl>
          <pre v-if="selectedLog.exception" class="mt-4 max-h-64 overflow-auto rounded-md bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">{{ selectedLog.exception }}</pre>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
/**
 * 系统日志页
 * 功能描述：查询、过滤、分页、查看和清理系统日志
 */
import { computed, onMounted, reactive, ref } from 'vue'

import { clearLogs, getLogStats, querySystemLogs } from '@/api/logs'
import AppAlert from '@/components/base/AppAlert.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import AppLoadingState from '@/components/base/AppLoadingState.vue'
import AppPagination from '@/components/base/AppPagination.vue'

const filters = reactive({
  logType: '',
  level: '',
  startTime: '',
  endTime: '',
  keyword: ''
})
const logs = ref([])
const stats = ref({})
const pagination = ref({
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 0
})
const loading = ref(false)
const error = ref('')
const selectedLog = ref(null)

const typeLabelMap = {
  system: '系统',
  request: '请求',
  operation: '操作'
}

const levelClassMap = {
  INFO: 'rounded bg-primary-50 px-2 py-0.5 text-primary-700',
  WARNING: 'rounded bg-amber-50 px-2 py-0.5 text-amber-700',
  ERROR: 'rounded bg-red-50 px-2 py-0.5 text-red-700'
}

const statItems = computed(() => [
  { label: '日志总数', value: stats.value.total ?? 0, icon: ['fas', 'list'] },
  { label: '请求日志', value: stats.value.request_count ?? 0, icon: ['fas', 'server'] },
  { label: '最近错误', value: stats.value.recent_error_count ?? 0, icon: ['fas', 'triangle-exclamation'] },
  { label: '最新时间', value: stats.value.latest_time || '-', icon: ['fas', 'clock-rotate-left'] }
])

const selectedLogFields = computed(() => {
  if (!selectedLog.value) return []
  const fields = [
    ['级别', selectedLog.value.level],
    ['类型', typeLabelMap[selectedLog.value.log_type] || selectedLog.value.log_type],
    ['日志器', selectedLog.value.logger_name],
    ['消息', selectedLog.value.message],
    ['站点', selectedLog.value.site],
    ['状态码', selectedLog.value.status],
    ['耗时', selectedLog.value.elapsed_ms ? `${selectedLog.value.elapsed_ms}ms` : ''],
    ['数据量', selectedLog.value.data_count],
    ['请求ID', selectedLog.value.request_id],
    ['URL', selectedLog.value.url],
    ['错误', selectedLog.value.error],
    ['操作', selectedLog.value.operation_type],
    ['说明', selectedLog.value.description]
  ]
  return fields
    .filter((item) => item[1] !== undefined && item[1] !== null && item[1] !== '')
    .map(([label, value]) => ({ label, value }))
})

const loadStats = async () => {
  const response = await getLogStats()
  stats.value = response.data || {}
}

const loadLogs = async () => {
  const response = await querySystemLogs({
    page: pagination.value.page,
    pageSize: pagination.value.page_size,
    logType: filters.logType || undefined,
    level: filters.level || undefined,
    startTime: filters.startTime || undefined,
    endTime: filters.endTime || undefined,
    keyword: filters.keyword || undefined
  })
  logs.value = response.data?.lists || []
  pagination.value = response.data?.pagination || pagination.value
}

const loadPageData = async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadStats(), loadLogs()])
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  loadPageData()
}

const handlePageChange = (page) => {
  pagination.value.page = page
  loadPageData()
}

const handleClearLogs = async () => {
  if (!window.confirm('确认清理当前日志和轮转日志？')) return
  loading.value = true
  error.value = ''
  try {
    await clearLogs({ includeBackups: true })
    selectedLog.value = null
    pagination.value.page = 1
    await loadPageData()
  } catch (clearError) {
    error.value = clearError.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPageData()
})
</script>
