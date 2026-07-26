<template>
  <AppModal :model-value="modelValue" :title="title" max-width="max-w-sm" @update:model-value="handleCancel">
    <p class="text-sm leading-6 text-zinc-600">{{ message }}</p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" class="toolbar-button" @click="handleCancel">
          {{ cancelText }}
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition"
          :class="danger ? 'bg-red-600 hover:bg-red-700' : 'bg-ink hover:bg-zinc-700'"
          :disabled="loading"
          @click="handleConfirm"
        >
          <font-awesome-icon v-if="loading" :icon="['fas', 'spinner']" class="fa-spin" aria-hidden="true" />
          {{ confirmText }}
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup>
/**
 * 通用确认弹窗组件
 * 功能描述：基于 AppModal 的二次确认弹窗，支持危险操作样式和加载态
 * 依赖组件：AppModal
 */
import AppModal from '@/components/base/AppModal.vue'

defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '确认操作'
  },
  message: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  danger: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}
</script>
