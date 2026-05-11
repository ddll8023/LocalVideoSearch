import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/user/Home.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/user/Settings.vue')
    },
    {
      path: '/video/:siteId/:vodId',
      name: 'VideoDetail',
      component: () => import('@/views/user/VideoDetail.vue'),
      props: (route) => ({
        siteId: route.params.siteId,
        vodId: route.params.vodId,
        keyword: route.query.keyword,
        page: route.query.page
      })
    },
    {
      path: '/video/:siteId/:vodId/play',
      name: 'VideoPlayer',
      component: () => import('@/views/user/VideoPlayer.vue'),
      props: (route) => ({
        siteId: route.params.siteId,
        vodId: route.params.vodId,
        keyword: route.query.keyword,
        page: route.query.page,
        url: route.query.url,
        title: route.query.title
      })
    },
    {
      path: '/admin',
      name: 'AdminDashboard',
      component: () => import('@/views/admin/Dashboard.vue')
    },
    {
      path: '/admin/system-monitor',
      name: 'SystemMonitor',
      component: () => import('@/views/admin/SystemMonitor.vue')
    },
    {
      path: '/admin/system-logs',
      name: 'SystemLogs',
      component: () => import('@/views/admin/SystemLogs.vue')
    }
  ]
})

export default router

