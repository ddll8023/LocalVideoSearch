<template>
  <section class="stagger-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <RouterLink
      v-for="item in entries"
      :key="item.name"
      class="surface group rounded-lg p-5 transition duration-300 hover:-translate-y-1 hover:border-primary-500 hover:shadow-glow"
      :to="item.to"
    >
      <font-awesome-icon :icon="item.icon" class="text-xl text-primary-700 transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110" aria-hidden="true" />
      <h1 class="mt-4 text-lg font-semibold text-zinc-900">{{ item.name }}</h1>
      <p class="mt-2 text-sm leading-6 text-zinc-500">{{ item.summary }}</p>
    </RouterLink>
  </section>
</template>

<script setup>
/**
 * 管理入口页
 * 功能描述：提供日志和监控模块入口
 */
const entries = [
  {
    name: '系统监控',
    summary: '运行状态、搜索趋势和站点性能。',
    to: '/admin/system-monitor',
    icon: ['fas', 'chart-line']
  },
  {
    name: '系统日志',
    summary: '请求日志、操作日志和错误记录。',
    to: '/admin/system-logs',
    icon: ['fas', 'list']
  },
  {
    name: '资源站设置',
    summary: '启用状态、连接测试和资源站配置。',
    to: '/settings',
    icon: ['fas', 'gear']
  }
]
</script>

