<template>
  <section class="grid gap-5 lg:grid-cols-[1fr_320px]">
    <div class="surface overflow-hidden rounded-lg">
      <div class="aspect-video bg-black">
        <video
          v-if="sourceUrl"
          ref="videoRef"
          class="h-full w-full"
          controls
          playsinline
        />
        <div v-else class="flex h-full items-center justify-center text-sm text-zinc-300">
          暂无播放地址
        </div>
      </div>
      <div class="border-t border-zinc-200 p-4">
        <h1 class="text-lg font-semibold text-zinc-900">{{ title || '视频播放' }}</h1>
        <p class="mt-1 text-sm text-zinc-500">{{ siteId }} / {{ vodId }}</p>
      </div>
    </div>

    <aside class="surface rounded-lg p-4">
      <h2 class="mb-3 text-sm font-semibold text-zinc-900">当前剧集</h2>
      <div class="rounded-md border border-primary-100 bg-primary-50 px-3 py-2 text-sm text-primary-700">
        {{ title || '未选择' }}
      </div>
    </aside>
  </section>
</template>

<script setup>
/**
 * 视频播放页
 * 功能描述：使用 video 与 HLS.js 播放视频地址
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Hls from 'hls.js'

const props = defineProps({
  siteId: { type: String, required: true },
  vodId: { type: String, required: true },
  url: { type: String, default: '' },
  title: { type: String, default: '' }
})

const videoRef = ref(null)
const hlsInstance = ref(null)
const sourceUrl = computed(() => props.url)

const destroyHls = () => {
  if (!hlsInstance.value) return
  hlsInstance.value.destroy()
  hlsInstance.value = null
}

const attachSource = (url) => {
  destroyHls()
  if (!url || !videoRef.value) return

  if (url.includes('.m3u8') && Hls.isSupported()) {
    hlsInstance.value = new Hls()
    hlsInstance.value.loadSource(url)
    hlsInstance.value.attachMedia(videoRef.value)
    return
  }

  videoRef.value.src = url
}

watch(
  sourceUrl,
  (url) => {
    attachSource(url)
  },
  { immediate: true }
)

onMounted(() => {
  attachSource(sourceUrl.value)
})

onBeforeUnmount(() => {
  destroyHls()
})
</script>
