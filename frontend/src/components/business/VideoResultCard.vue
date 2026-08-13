<template>
  <RouterLink
    class="result-card group cinema-scan block overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 transition duration-300 hover:border-primary-500 hover:shadow-glow"
    :to="to"
  >
    <div class="relative aspect-[4/5] overflow-hidden bg-zinc-100">
      <img
        v-if="video.thumbnail && !imageFailed"
        class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105 group-hover:grayscale-[0.12]"
        :src="video.thumbnail"
        :alt="video.title"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="flex h-full items-center justify-center text-zinc-300">
        <font-awesome-icon :icon="['fas', 'film']" class="text-3xl transition duration-500 group-hover:scale-110 group-hover:text-primary-500" aria-hidden="true" />
      </div>
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 transition duration-300 group-hover:opacity-90" />
      <span
        v-if="scoreText"
        class="absolute right-1.5 top-1.5 rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur"
      >
        {{ scoreText }}
      </span>
    </div>
    <div class="relative space-y-1 bg-panel/95 p-3">
      <span class="absolute left-3 top-0 h-px w-8 bg-primary-500/70 transition-all duration-500 group-hover:w-16" />
      <h2 class="line-clamp-2 text-sm font-semibold text-zinc-900 transition-colors duration-300 group-hover:text-primary-700">
        {{ video.title || '未命名视频' }}
      </h2>
      <p class="truncate text-xs text-zinc-500">
        {{ video.year || '未知年份' }} · {{ video.type_name || '未分类' }}
      </p>
      <p class="truncate text-xs text-zinc-400">{{ video.status || video.actor || '暂无更多信息' }}</p>
    </div>
  </RouterLink>
</template>

<script setup>
/**
 * 视频搜索结果卡片
 * 功能描述：展示视频封面、标题、评分角标和基础元信息，封面加载失败时降级为占位图
 */
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  video: { type: Object, required: true },
  to: { type: Object, required: true }
})

const imageFailed = ref(false)

watch(
  () => props.video?.thumbnail,
  () => {
    imageFailed.value = false
  }
)

const scoreText = computed(() => {
  const score = Number(props.video?.score)
  return Number.isFinite(score) && score > 0 ? score.toFixed(1) : ''
})
</script>
