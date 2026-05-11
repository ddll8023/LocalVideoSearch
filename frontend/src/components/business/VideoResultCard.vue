<template>
  <RouterLink
    class="group overflow-hidden rounded-md border border-zinc-200 bg-white transition hover:border-primary-500 hover:shadow-lift"
    :to="to"
  >
    <div class="aspect-[3/4] bg-zinc-100">
      <img
        v-if="video.thumbnail"
        class="h-full w-full object-cover"
        :src="video.thumbnail"
        :alt="video.title"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center text-zinc-300">
        <font-awesome-icon :icon="['fas', 'film']" class="text-3xl" aria-hidden="true" />
      </div>
    </div>
    <div class="space-y-2 p-3">
      <h2 class="line-clamp-2 min-h-10 text-sm font-semibold text-zinc-900 group-hover:text-primary-700">
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
 * 功能描述：展示视频封面、标题和基础元信息
 */
import { RouterLink } from 'vue-router'

defineProps({
  video: { type: Object, required: true },
  to: { type: Object, required: true }
})
</script>
