<template>
  <div :class="stateClasses">
    <font-awesome-icon :icon="['fas', 'spinner']" class="fa-spin mr-2" aria-hidden="true" />
    {{ text }}
  </div>
</template>

<script setup>
/**
 * 通用加载状态组件
 * 功能描述：统一展示页面级加载状态
 */
import { computed } from 'vue'

const props = defineProps({
  text: { type: String, default: '加载中' },
  framed: { type: Boolean, default: true }
})

const stateClasses = computed(() => [
  'rounded-lg px-5 py-12 text-center text-sm text-zinc-500',
  props.framed ? 'surface' : ''
])
</script>
