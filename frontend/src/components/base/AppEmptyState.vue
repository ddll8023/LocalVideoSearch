<template>
  <section :class="sectionClasses">
    <div class="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
      <div class="empty-icon flex h-14 w-14 items-center justify-center rounded-md bg-primary-50 text-primary-700">
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

<style scoped>
.empty-icon {
  animation: empty-breathe 3.6s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(120, 149, 154, 0.12);
}

@keyframes empty-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(120, 149, 154, 0.1);
    transform: translateY(0);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(120, 149, 154, 0.02);
    transform: translateY(-3px);
  }
}
</style>
