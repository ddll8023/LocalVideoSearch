<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-900">资源站设置</h1>
        <p class="mt-1 text-sm text-zinc-500">共 {{ resourceStore.stats.total }} 个，启用 {{ resourceStore.stats.enabled }} 个。</p>
      </div>
      <button class="toolbar-button" type="button" :disabled="resourceStore.loading" @click="resourceStore.fetchSites">
        <font-awesome-icon :icon="['fas', 'rotate']" aria-hidden="true" />
        <span>刷新</span>
      </button>
    </header>

    <div v-if="resourceStore.error" class="surface rounded-lg border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ resourceStore.error }}
    </div>

    <div class="surface overflow-hidden rounded-lg">
      <div class="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-zinc-200 px-4 py-3 text-xs font-semibold uppercase text-zinc-500">
        <span>站点</span>
        <span>状态</span>
        <span>操作</span>
      </div>

      <div v-if="resourceStore.sites.length === 0" class="px-4 py-12 text-center text-sm text-zinc-500">
        暂无资源站数据
      </div>

      <div
        v-for="site in resourceStore.sites"
        :key="site.site_id"
        class="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0"
      >
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-zinc-900">{{ site.name }}</h2>
          <p class="truncate text-xs text-zinc-500">{{ site.base_url }}</p>
        </div>
        <span
          class="rounded-md px-2 py-1 text-xs font-semibold"
          :class="site.enabled ? 'bg-primary-50 text-primary-700' : 'bg-zinc-100 text-zinc-500'"
        >
          {{ site.enabled ? '启用' : '禁用' }}
        </span>
        <div class="flex items-center gap-2">
          <button class="toolbar-button h-9" type="button" @click="resourceStore.toggleSite(site.site_id)">
            {{ site.enabled ? '禁用' : '启用' }}
          </button>
          <button
            class="toolbar-button h-9"
            type="button"
            :disabled="resourceStore.testingMap[site.site_id]"
            @click="resourceStore.testSite(site.site_id)"
          >
            测试
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 资源站设置页
 * 功能描述：展示资源站列表并提供启用切换和连接测试入口
 */
import { onMounted } from 'vue'

import { useResourceStore } from '@/stores/resources'

const resourceStore = useResourceStore()

onMounted(() => {
  resourceStore.fetchSites()
})
</script>

