<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-900">系统监控</h1>
        <p class="mt-1 text-sm text-zinc-500">实时摘要和关键运行指标。</p>
      </div>
      <button class="toolbar-button" type="button" :disabled="loading" @click="loadMonitorData">
        <font-awesome-icon :icon="['fas', 'rotate']" aria-hidden="true" />
        <span>刷新</span>
      </button>
    </header>

    <div v-if="error" class="surface rounded-lg border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="item in summaryItems" :key="item.label" class="surface rounded-lg p-5">
        <p class="text-sm text-zinc-500">{{ item.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-zinc-900">{{ item.value }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 系统监控页
 * 功能描述：展示后端监控聚合摘要
 */
import { computed, onMounted, ref } from 'vue'

import { getDashboardOverview } from '@/api/monitor'

const loading = ref(false)
const error = ref('')
const dashboard = ref({})

const summaryItems = computed(() => [
  { label: '活跃用户', value: dashboard.value.active_users ?? '-' },
  { label: '搜索次数', value: dashboard.value.search_count ?? '-' },
  { label: '成功率', value: dashboard.value.success_rate ?? '-' },
  { label: '平均响应', value: dashboard.value.average_response_time ?? '-' }
])

const loadMonitorData = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await getDashboardOverview()
    dashboard.value = response.data || {}
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadMonitorData()
})
</script>

