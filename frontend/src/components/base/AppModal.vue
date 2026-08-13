<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <div
          ref="dialogRef"
          class="modal-panel flex max-h-[85vh] w-full flex-col rounded-xl border border-zinc-200 bg-panel shadow-lift"
          :class="maxWidth"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
        >
          <header class="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h3 class="text-base font-semibold text-ink">{{ title }}</h3>
            <button
              type="button"
              class="text-zinc-400 transition hover:text-zinc-600"
              aria-label="关闭弹窗"
              @click="handleClose"
            >
              <font-awesome-icon :icon="['fas', 'xmark']" aria-hidden="true" />
            </button>
          </header>

          <div class="flex-1 overflow-y-auto px-5 py-4">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="border-t border-zinc-100 px-5 py-3">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * 通用弹窗组件
 * 功能描述：遮罩弹窗，支持 ESC 关闭、遮罩点击关闭、body 滚动锁定和过渡动画
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  maxWidth: {
    type: String,
    default: 'max-w-lg'
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const dialogRef = ref(null)

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') handleClose()
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeydown)
      nextTick(() => dialogRef.value?.focus())
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeydown)
    }
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.28s ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: opacity 0.3s ease, transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), filter 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
  filter: blur(4px);
}
</style>
