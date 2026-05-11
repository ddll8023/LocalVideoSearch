<template>
  <div class="app-shell">
    <header class="app-titlebar sticky top-0 z-20 border-b border-zinc-200 bg-canvas/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <RouterLink to="/" class="flex items-center gap-3 text-ink">
          <span class="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
            <font-awesome-icon :icon="['fas', 'video']" aria-hidden="true" />
          </span>
          <span class="text-base font-semibold">VideoSearch</span>
          <span class="text-xs text-zinc-400">v0.1.0</span>
        </RouterLink>

        <div class="flex items-center">
          <nav class="flex items-center gap-1">
            <RouterLink v-for="item in navItems" :key="item.name" :to="item.to" :class="itemClass(item.to)">
              <font-awesome-icon :icon="item.icon" aria-hidden="true" />
              <span class="hidden sm:inline">{{ item.name }}</span>
            </RouterLink>
          </nav>

          <div v-if="isDesktop" class="ml-2 flex items-center border-l border-zinc-200 pl-2">
            <button type="button" class="window-btn" title="最小化" @click="handleMinimize">
              <font-awesome-icon :icon="['fas', 'minus']" />
            </button>
            <button type="button" class="window-btn" :title="isMaximized ? '还原' : '最大化'" @click="handleMaximize">
              <font-awesome-icon :icon="isMaximized ? ['fas', 'window-restore'] : ['fas', 'square']" />
            </button>
            <button type="button" class="window-btn window-btn-close" title="关闭" @click="handleClose">
              <font-awesome-icon :icon="['fas', 'xmark']" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup>
/**
 * 应用根组件
 * 功能描述：提供桌面端全局导航、窗口控制和路由出口
 */
import { computed, onMounted, ref } from 'vue'
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

const isDesktop = computed(() => !!window.desktopApi)
const isMaximized = ref(false)

const handleMinimize = () => window.desktopApi?.windowMinimize()
const handleMaximize = () => window.desktopApi?.windowMaximize()
const handleClose = () => window.desktopApi?.windowClose()

onMounted(() => {
  if (window.desktopApi?.onMaximizedChanged) {
    window.desktopApi.onMaximizedChanged((val) => { isMaximized.value = val })
  }
  if (window.desktopApi?.windowIsMaximized) {
    window.desktopApi.windowIsMaximized().then((val) => { isMaximized.value = val })
  }
})
</script>

<style scoped>
.app-titlebar {
  -webkit-app-region: drag;
}

.app-titlebar a,
.app-titlebar button,
.app-titlebar nav {
  -webkit-app-region: no-drag;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
