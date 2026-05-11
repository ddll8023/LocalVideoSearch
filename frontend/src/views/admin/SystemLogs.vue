<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-900">系统日志</h1>
        <p class="mt-1 text-sm text-zinc-500">系统、请求和操作日志。</p>
      </div>
      <button class="toolbar-button" type="button" :disabled="loading" @click="loadLogs">
        <font-awesome-icon :icon="['fas', 'rotate']" aria-hidden="true" />
        <span>刷新</span>
      </button>
    </header>

    <div class="surface rounded-lg p-4">
      <div class="grid gap-3 sm:grid-cols-[160px_160px_1fr_auto]">
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
        <input v-model="filters.keyword" class="field-input" type="search" placeholder="关键词" />
        <button class="primary-button" type="button" @click="loadLogs">筛选</button>
      </div>
    </div>

    <div v-if="error" class="surface rounded-lg border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <div class="surface overflow-hidden rounded-lg">
      <div v-if="logs.length === 0" class="px-4 py-12 text-center text-sm text-zinc-500">
        暂无日志数据
      </div>
      <div v-for="item in logs" :key="item.timestamp + item.message" class="border-b border-zinc-100 px-4 py-3 last:border-b-0">
        <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>{{ item.time || item.timestamp }}</span>
          <span>{{ item.level }}</span>
          <span>{{ item.log_type }}</span>
        </div>
        <p class="mt-2 text-sm text-zinc-900">{{ item.message }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 系统日志页
 * 功能描述：查询并展示系统日志列表
 */
import { onMounted, reactive, ref } from 'vue'

import { querySystemLogs } from '@/api/logs'

const filters = reactive({
  logType: '',
  level: '',
  keyword: ''
})
const logs = ref([])
const loading = ref(false)
const error = ref('')

const loadLogs = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await querySystemLogs({
      logType: filters.logType || undefined,
      level: filters.level || undefined,
      keyword: filters.keyword || undefined
    })
    logs.value = response.data?.lists || []
  } catch (loadError) {
    error.value = loadError.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLogs()
})
</script>

