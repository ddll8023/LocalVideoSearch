<template>
  <div class="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-80 flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg"
        :class="typeClasses[toast.type] || typeClasses.info"
      >
        <font-awesome-icon
          :icon="typeIcons[toast.type] || typeIcons.info"
          class="mt-0.5 flex-shrink-0"
          aria-hidden="true"
        />
        <p class="flex-1 text-sm leading-5">{{ toast.message }}</p>
        <button
          type="button"
          class="flex-shrink-0 text-zinc-400 transition hover:text-zinc-600"
          aria-label="关闭提示"
          @click="toastStore.removeToast(toast.id)"
        >
          <font-awesome-icon :icon="['fas', 'xmark']" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
/**
 * 全局消息提示组件
 * 功能描述：渲染 toast store 中的消息队列，右下角堆叠展示，自动消失
 */
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const typeClasses = {
  success: 'border-green-200 text-green-800',
  error: 'border-red-200 text-red-800',
  warning: 'border-yellow-200 text-yellow-800',
  info: 'border-zinc-200 text-zinc-700'
}

const typeIcons = {
  success: ['fas', 'circle-check'],
  error: ['fas', 'triangle-exclamation'],
  warning: ['fas', 'triangle-exclamation'],
  info: ['fas', 'circle-info']
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
