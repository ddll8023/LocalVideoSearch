<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-900">资源站设置</h1>
        <p class="mt-1 text-sm text-zinc-500">管理本机启用的搜索来源和连接状态</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          class="toolbar-button"
          type="button"
          :disabled="resourceStore.loading"
          @click="safeFetchSites"
        >
          <font-awesome-icon
            :icon="resourceStore.loading ? ['fas', 'spinner'] : ['fas', 'rotate']"
            :class="resourceStore.loading ? 'fa-spin' : ''"
            aria-hidden="true"
          />
          <span>刷新</span>
        </button>
        <button
          class="primary-button"
          type="button"
          :disabled="resourceStore.enabledSites.length === 0 || hasTesting"
          @click="safeTestEnabledSites"
        >
          <font-awesome-icon :icon="['fas', 'flask']" aria-hidden="true" />
          <span>测试已启用</span>
        </button>
      </div>
    </header>

    <section class="grid gap-3 sm:grid-cols-3">
      <div v-for="item in statItems" :key="item.label" class="surface rounded-lg p-4">
        <p class="text-sm text-zinc-500">{{ item.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-zinc-900">{{ item.value }}</p>
      </div>
    </section>

    <div v-if="resourceStore.error" class="surface rounded-lg border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="mr-2" aria-hidden="true" />
      {{ resourceStore.error }}
    </div>

    <section class="surface overflow-hidden rounded-lg">
      <header class="grid grid-cols-[1fr_auto] gap-3 border-b border-zinc-200 px-4 py-3 text-xs font-semibold uppercase text-zinc-500 md:grid-cols-[1fr_96px_180px_180px]">
        <span>站点</span>
        <span class="text-center">状态</span>
        <span class="hidden md:block">连接测试</span>
        <span class="text-right">操作</span>
      </header>

      <div v-if="resourceStore.loading && resourceStore.sites.length === 0" class="px-4 py-12 text-center text-sm text-zinc-500">
        <font-awesome-icon :icon="['fas', 'spinner']" class="fa-spin mr-2" aria-hidden="true" />
        正在加载资源站
      </div>

      <div v-else-if="resourceStore.sites.length === 0" class="px-4 py-12 text-center text-sm text-zinc-500">
        暂无资源站数据
      </div>

      <article
        v-for="site in resourceStore.sites"
        :key="site.site_id"
        class="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0 md:grid-cols-[1fr_96px_180px_180px]"
      >
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-zinc-900">{{ site.name }}</h2>
          <p class="truncate text-xs text-zinc-500">{{ site.base_url }}</p>
          <p class="mt-1 text-xs text-zinc-400">
            超时 {{ site.timeout }}s · 搜索参数 {{ site.search_endpoint }} · 分页参数 {{ site.page_param }}
          </p>
        </div>

        <span
          class="justify-self-center rounded-md px-2 py-1 text-xs font-semibold"
          :class="site.enabled ? 'bg-primary-50 text-primary-700' : 'bg-zinc-100 text-zinc-500'"
        >
          {{ site.enabled ? '启用' : '禁用' }}
        </span>

        <div class="col-span-2 md:col-span-1">
          <div
            v-if="resourceStore.testingMap[site.site_id]"
            class="text-sm text-zinc-500"
          >
            <font-awesome-icon :icon="['fas', 'spinner']" class="fa-spin mr-2" aria-hidden="true" />
            测试中
          </div>
          <div v-else-if="resourceStore.testResultMap[site.site_id]" class="text-sm">
            <p :class="resourceStore.testResultMap[site.site_id].success ? 'text-primary-700' : 'text-red-700'">
              <font-awesome-icon
                :icon="resourceStore.testResultMap[site.site_id].success ? ['fas', 'circle-check'] : ['fas', 'ban']"
                class="mr-2"
                aria-hidden="true"
              />
              {{ resourceStore.testResultMap[site.site_id].message }}
            </p>
            <p class="mt-1 text-xs text-zinc-400">
              {{ formatDuration(resourceStore.testResultMap[site.site_id].elapsed_ms) }}
            </p>
          </div>
          <div v-else class="text-sm text-zinc-400">未测试</div>
        </div>

        <div class="col-span-2 flex justify-end gap-2 md:col-span-1">
          <button
            class="toolbar-button h-9"
            type="button"
            :disabled="resourceStore.togglingMap[site.site_id]"
            @click="safeToggleSite(site.site_id)"
          >
            {{ site.enabled ? '禁用' : '启用' }}
          </button>
          <button
            class="toolbar-button h-9"
            type="button"
            :disabled="resourceStore.testingMap[site.site_id]"
            @click="safeTestSite(site.site_id)"
          >
            测试
          </button>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup>
/**
 * 资源站设置页
 * 功能描述：展示资源站列表、统计、启停切换和连接测试结果
 */
import { computed, onMounted } from 'vue'

import { useResourceStore } from '@/stores/resources'
import { formatDuration } from '@/utils/format'

const resourceStore = useResourceStore()

const statItems = computed(() => [
  { label: '资源站总数', value: resourceStore.stats.total },
  { label: '已启用', value: resourceStore.stats.enabled },
  { label: '已禁用', value: resourceStore.stats.disabled }
])
const hasTesting = computed(() => Object.values(resourceStore.testingMap).some(Boolean))

onMounted(() => {
  safeFetchSites()
})

const safeFetchSites = async () => {
  try {
    await resourceStore.fetchSites()
  } catch {
    // 错误状态由 Store 统一维护。
  }
}

const safeToggleSite = async (siteId) => {
  try {
    await resourceStore.toggleSite(siteId)
  } catch {
    // 错误状态由 Store 统一维护。
  }
}

const safeTestSite = async (siteId) => {
  try {
    await resourceStore.testSite(siteId)
  } catch {
    // 错误状态由 Store 统一维护。
  }
}

const safeTestEnabledSites = async () => {
  try {
    await resourceStore.testEnabledSites()
  } catch {
    // 批量测试会继续处理其余站点，错误状态由 Store 统一维护。
  }
}
</script>
