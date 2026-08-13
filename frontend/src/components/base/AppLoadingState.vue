<template>
  <div :class="stateClasses" role="status" aria-live="polite" aria-busy="true">
    <span class="loading-orbit" aria-hidden="true">
      <font-awesome-icon :icon="['fas', 'spinner']" />
    </span>
    <span>{{ text }}</span>
    <span class="loading-track" aria-hidden="true" />
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
  'relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-lg px-5 py-12 text-center text-sm text-zinc-500',
  props.framed ? 'surface' : ''
])
</script>

<style scoped>
.loading-orbit {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(120, 149, 154, 0.22);
  border-radius: 9999px;
  color: #78959a;
  animation: orbit-pulse 1.8s ease-in-out infinite;
}

.loading-orbit svg {
  animation: orbit-spin 1s linear infinite;
}

.loading-track {
  position: absolute;
  right: 15%;
  bottom: 1.5rem;
  left: 15%;
  height: 1px;
  overflow: hidden;
  background: #273036;
}

.loading-track::after {
  display: block;
  width: 28%;
  height: 100%;
  content: '';
  background: #78959a;
  animation: loading-sweep 1.5s ease-in-out infinite;
}

@keyframes orbit-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(120, 149, 154, 0.08);
    transform: scale(0.96);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(120, 149, 154, 0.02);
    transform: scale(1);
  }
}

@keyframes orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes loading-sweep {
  0% {
    transform: translateX(-140%);
  }
  100% {
    transform: translateX(480%);
  }
}
</style>
