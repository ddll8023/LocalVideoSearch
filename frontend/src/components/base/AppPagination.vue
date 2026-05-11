<template>
  <footer class="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
      {{ label }} 第 {{ currentPage }} / {{ totalPages }} 页 · 每页 {{ pageSize }}
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
  </footer>
</template>

<script setup>
/**
 * 通用分页组件
 * 功能描述：统一列表上一页、下一页交互
 */
import { computed } from 'vue'

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
</script>
