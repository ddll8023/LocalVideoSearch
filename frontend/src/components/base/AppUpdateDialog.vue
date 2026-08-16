<template>
  <AppModal
    :model-value="isVisible"
    title="软件更新"
    max-width="max-w-md"
    @update:model-value="handleVisibilityChange"
  >
    <div class="space-y-4" role="status" aria-live="polite">
      <div v-if="isAvailable" class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <font-awesome-icon :icon="['fas', 'download']" aria-hidden="true" />
        </span>
        <div class="space-y-1">
          <p class="font-medium text-ink">发现新版本 v{{ status.version }}</p>
          <p v-if="status.releaseName" class="text-sm text-zinc-600">{{ status.releaseName }}</p>
          <p class="text-sm text-zinc-500">下载完成后可以立即重启安装，也可以稍后处理。</p>
        </div>
      </div>

      <div v-else-if="isDownloading" class="space-y-3">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <font-awesome-icon class="animate-pulse" :icon="['fas', 'download']" aria-hidden="true" />
          </span>
          <div>
            <p class="font-medium text-ink">正在下载 v{{ status.version }}</p>
            <p class="text-sm text-zinc-500">请保持软件运行，下载将在后台继续。</p>
          </div>
        </div>
        <div
          class="h-2 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-label="更新下载进度"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="h-full rounded-full bg-primary-600 transition-[width]" :style="{ width: `${progress}%` }" />
        </div>
        <p class="text-right text-xs text-zinc-500">{{ progress }}%</p>
      </div>

      <div v-else class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <font-awesome-icon :icon="['fas', 'circle-check']" aria-hidden="true" />
        </span>
        <div class="space-y-1">
          <p class="font-medium text-ink">新版本已下载</p>
          <p class="text-sm text-zinc-500">重启软件即可完成 v{{ status.version }} 安装。</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="toolbar-button" @click="handleLater">
          {{ isDownloading ? '后台下载' : '稍后' }}
        </button>
        <button v-if="isAvailable" type="button" class="primary-button" @click="$emit('download')">
          下载更新
        </button>
        <button v-else-if="isDownloaded" type="button" class="primary-button" @click="$emit('install')">
          立即重启安装
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup>
/**
 * 桌面应用更新弹窗
 * 功能描述：展示新版本、下载进度和安装入口；更新检查只在 Electron 打包环境启用
 */
import { computed, ref, watch } from 'vue'

import AppModal from './AppModal.vue'

const props = defineProps({
  status: {
    type: Object,
    default: () => ({ status: 'idle', version: '', releaseName: '', percent: 0 })
  }
})

const emit = defineEmits(['download', 'install', 'dismiss'])
const dismissed = ref(false)

const isAvailable = computed(() => props.status.status === 'available')
const isDownloading = computed(() => ['downloading', 'installing'].includes(props.status.status))
const isDownloaded = computed(() => props.status.status === 'downloaded')
const isVisible = computed(() => !dismissed.value && (isAvailable.value || isDownloading.value || isDownloaded.value))
const progress = computed(() => Math.min(100, Math.max(0, Math.round(Number(props.status.percent) || 0))))

watch(
  () => props.status.status,
  (status) => {
    if (status === 'available' || status === 'downloaded') {
      dismissed.value = false
    }
  }
)

const handleVisibilityChange = (visible) => {
  if (!visible) {
    dismissed.value = true
    emit('dismiss')
  }
}

const handleLater = () => {
  dismissed.value = true
  emit('dismiss')
}
</script>
