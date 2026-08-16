<template>
  <div class="app-shell relative overflow-x-clip">
    <div class="ambient-orb -left-32 top-32" aria-hidden="true" />
    <div class="ambient-orb -right-40 top-[42rem] opacity-20" aria-hidden="true" />

    <header class="app-titlebar sticky top-0 z-20 border-b border-zinc-200/80 bg-canvas/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <RouterLink to="/" class="group flex items-center gap-3 text-ink">
          <span class="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-zinc-950 text-white shadow-lg transition duration-300 group-hover:rotate-[-4deg] group-hover:scale-105">
            <span class="absolute inset-0 bg-gradient-to-br from-primary-500/40 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
            <font-awesome-icon class="relative" :icon="['fas', 'video']" aria-hidden="true" />
          </span>
          <span>
            <span class="block text-base font-semibold tracking-wide">VideoSearch</span>
            <span class="block text-[9px] uppercase tracking-[0.28em] text-zinc-400">Local cinema index</span>
          </span>
          <span class="hidden text-xs text-zinc-400 sm:inline">v{{ appVersion }}</span>
        </RouterLink>

        <div class="flex items-center">
          <nav class="flex items-center gap-1">
            <RouterLink v-for="item in navItems" :key="item.name" :to="item.to" :class="itemClass(item.to)">
              <font-awesome-icon :icon="item.icon" aria-hidden="true" />
              <span class="hidden sm:inline">{{ item.name }}</span>
              <span class="nav-marker" aria-hidden="true" />
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

    <main class="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <AppUpdateDialog
      :status="updateStatus"
      @download="handleUpdateDownload"
      @install="handleUpdateInstall"
    />
    <AppToast />
  </div>
</template>

<script setup>
/**
 * 应用根组件
 * 功能描述：提供桌面端全局导航、窗口控制、路由出口和全局消息提示
 * 依赖组件：AppToast
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import AppToast from '@/components/base/AppToast.vue'
import AppUpdateDialog from '@/components/base/AppUpdateDialog.vue'

const route = useRoute()

const navItems = [
  { name: '搜索', to: '/', icon: ['fas', 'magnifying-glass'] },
  { name: '收藏', to: '/favorites', icon: ['fas', 'heart'] },
  { name: '设置', to: '/settings', icon: ['fas', 'gear'] },
  { name: '监控', to: '/admin/system-monitor', icon: ['fas', 'chart-line'] },
  { name: '日志', to: '/admin/system-logs', icon: ['fas', 'list'] }
]

const currentPath = computed(() => route.path)

const itemClass = (to) => [
  'relative inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition',
  currentPath.value === to
    ? 'bg-zinc-950 text-white shadow-lg'
    : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-primary-700'
]

const isDesktop = computed(() => !!window.desktopApi)
const isMaximized = ref(false)
const appVersion = ref('0.1.0')
const updateStatus = ref({
  status: 'idle',
  version: '',
  releaseName: '',
  percent: 0,
  error: ''
})
let stopUpdateStatus = null

const handleMinimize = () => window.desktopApi?.windowMinimize()
const handleMaximize = () => window.desktopApi?.windowMaximize()
const handleClose = () => window.desktopApi?.windowClose()
const handleUpdateDownload = () => window.desktopApi?.downloadUpdate()
const handleUpdateInstall = () => window.desktopApi?.installUpdate()

onMounted(async () => {
  if (window.desktopApi?.onMaximizedChanged) {
    window.desktopApi.onMaximizedChanged((val) => { isMaximized.value = val })
  }
  if (window.desktopApi?.windowIsMaximized) {
    window.desktopApi.windowIsMaximized().then((val) => { isMaximized.value = val })
  }
  if (window.desktopApi?.getAppInfo) {
    const appInfo = await window.desktopApi.getAppInfo()
    if (appInfo?.version) {
      appVersion.value = appInfo.version
    }
  }
  if (window.desktopApi?.onUpdateStatus) {
    stopUpdateStatus = window.desktopApi.onUpdateStatus((status) => {
      updateStatus.value = status
    })
    const currentStatus = await window.desktopApi.getUpdateStatus?.()
    if (currentStatus) {
      updateStatus.value = currentStatus
    }
  }
})

onBeforeUnmount(() => {
  stopUpdateStatus?.()
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

.nav-marker {
  position: absolute;
  right: 0.75rem;
  bottom: 0.25rem;
  left: 0.75rem;
  height: 1px;
  opacity: 0;
  transform: scaleX(0.35);
  background: #78959a;
  transition: opacity 260ms ease, transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.router-link-active .nav-marker {
  opacity: 0.9;
  transform: scaleX(1);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.38s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), filter 0.38s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.995);
  filter: blur(4px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  filter: blur(3px);
}
</style>
