import { defineStore } from 'pinia'
import { ref } from 'vue'

let toastSeed = 0

/**
 * 全局消息提示 Store
 * 管理 Toast 队列，供 AppToast 组件渲染
 */
export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  const removeToast = (id) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const addToast = ({ message, type = 'info', duration = 3000 }) => {
    if (!message) return
    const id = ++toastSeed
    toasts.value.push({ id, message, type })
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
    return id
  }

  const success = (message, duration) => addToast({ message, type: 'success', duration })
  const error = (message, duration) => addToast({ message, type: 'error', duration: duration ?? 4500 })
  const warning = (message, duration) => addToast({ message, type: 'warning', duration })
  const info = (message, duration) => addToast({ message, type: 'info', duration })

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
})
