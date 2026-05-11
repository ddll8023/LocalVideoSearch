<template>
  <div class="app-shell">
    <header class="sticky top-0 z-20 border-b border-zinc-200 bg-canvas/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <RouterLink to="/" class="flex items-center gap-3 text-ink">
          <span class="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
            <font-awesome-icon :icon="['fas', 'video']" aria-hidden="true" />
          </span>
          <span class="text-base font-semibold">VideoSearch</span>
        </RouterLink>

        <nav class="flex items-center gap-1">
          <RouterLink v-for="item in navItems" :key="item.name" :to="item.to" :class="itemClass(item.to)">
            <font-awesome-icon :icon="item.icon" aria-hidden="true" />
            <span class="hidden sm:inline">{{ item.name }}</span>
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
/**
 * 应用根组件
 * 功能描述：提供桌面端全局导航和路由出口
 */
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { name: '搜索', to: '/', icon: ['fas', 'magnifying-glass'] },
  { name: '设置', to: '/settings', icon: ['fas', 'gear'] },
  { name: '监控', to: '/admin/system-monitor', icon: ['fas', 'chart-line'] },
  { name: '日志', to: '/admin/system-logs', icon: ['fas', 'list'] }
]

const currentPath = computed(() => route.path)

const itemClass = (to) => [
  'inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition',
  currentPath.value === to
    ? 'bg-ink text-white'
    : 'text-zinc-600 hover:bg-white hover:text-primary-700'
]
</script>

