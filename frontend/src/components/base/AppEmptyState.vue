<template>
  <section :class="sectionClasses">
    <div class="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-md bg-primary-50 text-primary-700">
        <font-awesome-icon :icon="icon" class="text-xl" aria-hidden="true" />
      </div>
      <div>
        <h1 class="text-xl font-semibold text-zinc-900">{{ title }}</h1>
        <p v-if="description" class="mt-2 text-sm text-zinc-500">{{ description }}</p>
      </div>
      <slot />
    </div>
  </section>
</template>

<script setup>
/**
 * 通用空状态组件
 * 功能描述：统一展示用户端页面的无数据状态
 */
import { computed } from 'vue'

const props = defineProps({
  icon: { type: Array, default: () => ['fas', 'circle-info'] },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  framed: { type: Boolean, default: true }
})

const sectionClasses = computed(() => [
  'rounded-lg p-8',
  props.framed ? 'surface' : 'border border-dashed border-zinc-200 bg-zinc-50'
])
</script>
