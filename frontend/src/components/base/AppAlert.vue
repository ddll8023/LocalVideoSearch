<template>
  <div :class="alertClasses" role="alert">
    <font-awesome-icon :icon="displayIcon" class="mt-0.5 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <p class="leading-6">{{ message }}</p>
      <button
        v-if="showRetry"
        class="mt-2 text-sm font-semibold underline-offset-4 hover:underline"
        type="button"
        @click="emit('retry')"
      >
        {{ retryLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * 通用提示组件
 * 功能描述：统一展示用户端页面的错误、警告和信息提示
 */
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'error',
    validator: (value) => ['error', 'warning', 'info', 'success'].includes(value)
  },
  title: { type: String, default: '' },
  message: { type: String, required: true },
  showRetry: { type: Boolean, default: false },
  retryLabel: { type: String, default: '重试' },
  icon: { type: Array, default: () => [] }
})

const emit = defineEmits(['retry'])

const typeClassMap = {
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-primary-100 bg-primary-50 text-primary-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

const typeIconMap = {
  error: ['fas', 'triangle-exclamation'],
  warning: ['fas', 'triangle-exclamation'],
  info: ['fas', 'circle-info'],
  success: ['fas', 'circle-check']
}

const alertClasses = computed(() => [
  'flex gap-3 rounded-lg border p-4 text-sm',
  typeClassMap[props.type]
])

const displayIcon = computed(() => (props.icon.length > 0 ? props.icon : typeIconMap[props.type]))
</script>
