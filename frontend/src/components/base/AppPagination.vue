<template>
  <footer class="flex flex-col gap-3 border-t border-zinc-100 pt-4">
    <!-- 移动端：简化版 -->
    <div class="flex items-center justify-between sm:hidden">
      <button
        class="toolbar-button"
        type="button"
        :disabled="!canPrevPage || loading"
        @click="emit('page-change', currentPage - 1)"
      >
        <font-awesome-icon :icon="['fas', 'chevron-left']" aria-hidden="true" />
        <span>上一页</span>
      </button>
      <span class="text-center text-sm text-zinc-500">
        {{ label }} 第 {{ currentPage }} / {{ totalPages }} 页
      </span>
      <button
        class="toolbar-button"
        type="button"
        :disabled="!canNextPage || loading"
        @click="emit('page-change', currentPage + 1)"
      >
        <span>下一页</span>
        <font-awesome-icon :icon="['fas', 'chevron-right']" aria-hidden="true" />
      </button>
    </div>

    <!-- 桌面端：完整分页 -->
    <div class="hidden items-center justify-between sm:flex">
      <div class="flex items-center gap-1">
        <button
          class="page-btn"
          type="button"
          :disabled="!canPrevPage || loading"
          @click="emit('page-change', currentPage - 1)"
        >
          <font-awesome-icon :icon="['fas', 'chevron-left']" class="text-[10px]" aria-hidden="true" />
        </button>

        <template v-for="(item, index) in visiblePages" :key="index">
          <span v-if="item === '...'" class="px-1 text-xs text-zinc-400 select-none">...</span>
          <button
            v-else
            class="page-btn"
            :class="{ 'page-btn-active': item === currentPage }"
            type="button"
            :disabled="loading"
            @click="emit('page-change', item)"
          >
            {{ item }}
          </button>
        </template>

        <button
          class="page-btn"
          type="button"
          :disabled="!canNextPage || loading"
          @click="emit('page-change', currentPage + 1)"
        >
          <font-awesome-icon :icon="['fas', 'chevron-right']" class="text-[10px]" aria-hidden="true" />
        </button>
      </div>

      <div class="flex items-center gap-2 text-xs text-zinc-500">
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <span class="text-zinc-300">|</span>
        <span>跳至</span>
        <input
          v-model.number="jumpInput"
          class="jump-input"
          type="number"
          :min="1"
          :max="totalPages"
          @keyup.enter="handleJump"
          @blur="resetJumpInput"
        />
        <span>页</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  pagination: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  label: { type: String, default: '' }
})

const emit = defineEmits(['page-change'])

const currentPage = computed(() => Number(props.pagination?.page || 1))
const pageSize = computed(() => Number(props.pagination?.page_size || 20))
const totalPages = computed(() => Math.max(Number(props.pagination?.total_pages || 1), 1))
const canPrevPage = computed(() => currentPage.value > 1)
const canNextPage = computed(() => currentPage.value < totalPages.value)

const jumpInput = ref(null)

const visiblePages = computed(() => {
  const current = currentPage.value
  const total = totalPages.value

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const delta = 2
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)

  const pages = [1]

  if (left > 2) pages.push('...')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push('...')

  pages.push(total)
  return pages
})

const handleJump = () => {
  const page = Number(jumpInput.value)
  if (Number.isInteger(page) && page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    emit('page-change', page)
  }
  jumpInput.value = null
}

const resetJumpInput = () => {
  jumpInput.value = null
}
</script>

<style scoped>
.jump-input::-webkit-inner-spin-button,
.jump-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.jump-input {
  -moz-appearance: textfield;
}
</style>
