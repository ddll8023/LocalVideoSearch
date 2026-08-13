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
        <button class="toolbar-button" type="button" :disabled="exporting" @click="handleExportConfig">
          <font-awesome-icon
            :icon="exporting ? ['fas', 'spinner'] : ['fas', 'file-export']"
            :class="exporting ? 'fa-spin' : ''"
            aria-hidden="true"
          />
          <span>导出配置</span>
        </button>
        <button class="toolbar-button" type="button" :disabled="importing" @click="triggerImportFile">
          <font-awesome-icon
            :icon="importing ? ['fas', 'spinner'] : ['fas', 'file-import']"
            :class="importing ? 'fa-spin' : ''"
            aria-hidden="true"
          />
          <span>导入配置</span>
        </button>
        <input
          ref="importInputRef"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="handleImportFileChange"
        />
        <button
          class="primary-button"
          type="button"
          :disabled="resourceStore.enabledSites.length === 0 || hasTesting"
          @click="safeTestEnabledSites"
        >
          <font-awesome-icon :icon="['fas', 'flask']" aria-hidden="true" />
          <span>测试已启用</span>
        </button>
        <button class="primary-button" type="button" @click="openCreateForm">
          <font-awesome-icon :icon="['fas', 'plus']" aria-hidden="true" />
          <span>新增站点</span>
        </button>
      </div>
    </header>

    <section class="stagger-grid grid gap-3 sm:grid-cols-3">
      <div v-for="item in statItems" :key="item.label" class="surface rounded-lg p-4">
        <p class="text-sm text-zinc-500">{{ item.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-zinc-900">{{ item.value }}</p>
      </div>
    </section>

    <AppAlert
      v-if="resourceStore.error"
      :message="resourceStore.error"
      show-retry
      @retry="resourceStore.fetchSites()"
    />

    <section class="surface overflow-hidden rounded-lg">
      <div class="border-b border-zinc-200 px-4 py-3">
        <div class="relative max-w-xs">
          <font-awesome-icon
            :icon="['fas', 'filter']"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400"
            aria-hidden="true"
          />
          <input
            v-model.trim="filterKeyword"
            type="text"
            class="h-9 w-full rounded-md border border-zinc-300 bg-zinc-100/75 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="按名称过滤站点"
          />
        </div>
      </div>

      <header class="grid grid-cols-[1fr_auto] gap-3 border-b border-zinc-200 px-4 py-3 text-xs font-semibold uppercase text-zinc-500 md:grid-cols-[1fr_96px_180px_220px]">
        <span>站点</span>
        <span class="text-center">状态</span>
        <span class="hidden md:block">连接测试</span>
        <span class="text-right">操作</span>
      </header>

      <AppLoadingState
        v-if="resourceStore.loading && resourceStore.sites.length === 0"
        :framed="false"
        text="正在加载资源站"
      />

      <AppEmptyState
        v-else-if="resourceStore.sites.length === 0"
        :framed="false"
        :icon="['fas', 'server']"
        title="暂无资源站数据"
        description="资源配置初始化后会显示可用站点"
      />

      <AppEmptyState
        v-else-if="filteredSites.length === 0"
        :framed="false"
        :icon="['fas', 'filter']"
        title="无匹配站点"
        description="没有名称匹配当前过滤条件的站点"
      />

      <article
        v-for="site in filteredSites"
        :key="site.site_id"
        class="resource-row grid grid-cols-[1fr_auto] items-center gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0 md:grid-cols-[1fr_96px_180px_220px]"
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
            @click="safeToggleSite(site)"
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
          <button
            class="toolbar-button h-9 w-9 px-0"
            type="button"
            aria-label="编辑站点"
            @click="openEditForm(site)"
          >
            <font-awesome-icon :icon="['fas', 'pen']" aria-hidden="true" />
          </button>
          <button
            class="toolbar-button h-9 w-9 px-0 hover:border-red-500 hover:text-red-600"
            type="button"
            aria-label="删除站点"
            @click="openDeleteConfirm(site)"
          >
            <font-awesome-icon :icon="['fas', 'trash']" aria-hidden="true" />
          </button>
        </div>
      </article>
    </section>

    <AppModal
      v-model="formVisible"
      :title="formMode === 'create' ? '新增站点' : '编辑站点'"
      max-width="max-w-xl"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-zinc-700">站点 ID</span>
          <input
            v-model.trim="siteForm.siteId"
            type="text"
            class="field-input h-10 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
            placeholder="如 my_site"
            :disabled="formMode === 'edit'"
          />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-zinc-700">站点名称</span>
          <input v-model.trim="siteForm.name" type="text" class="field-input h-10" placeholder="如 某某资源站" />
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-sm font-medium text-zinc-700">接口地址</span>
          <input v-model.trim="siteForm.baseUrl" type="text" class="field-input h-10" placeholder="如 https://example.com" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-zinc-700">超时（秒，1-120）</span>
          <input v-model="siteForm.timeout" type="number" min="1" max="120" class="field-input h-10" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-zinc-700">搜索端点</span>
          <input v-model.trim="siteForm.searchEndpoint" type="text" class="field-input h-10" placeholder="如 /api.php/provide/vod/" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-zinc-700">分页参数</span>
          <input v-model.trim="siteForm.pageParam" type="text" class="field-input h-10" placeholder="如 pg" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-zinc-700">动作参数</span>
          <input v-model.trim="siteForm.actionParam" type="text" class="field-input h-10" placeholder="如 ac" />
        </label>
        <label class="flex items-center gap-2 sm:col-span-2">
          <input
            v-model="siteForm.enabled"
            type="checkbox"
            class="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm text-zinc-700">启用该站点</span>
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="toolbar-button" type="button" @click="formVisible = false">取消</button>
          <button class="primary-button h-10" type="button" :disabled="submitting" @click="handleSubmitForm">
            <font-awesome-icon v-if="submitting" :icon="['fas', 'spinner']" class="fa-spin" aria-hidden="true" />
            <span>{{ formMode === 'create' ? '创建' : '保存' }}</span>
          </button>
        </div>
      </template>
    </AppModal>

    <AppConfirm
      v-model="deleteConfirmVisible"
      title="删除资源站"
      :message="`确定删除站点「${deleteTarget?.name || ''}」吗？删除后不可恢复。`"
      confirm-text="删除"
      danger
      :loading="deleting"
      @confirm="handleConfirmDelete"
    />
  </section>
</template>

<script setup>
/**
 * 资源站设置页
 * 功能描述：展示资源站列表、统计、启停切换、连接测试，并支持站点增删改、名称过滤和配置导入导出
 * 依赖组件：AppAlert、AppConfirm、AppEmptyState、AppLoadingState、AppModal
 */
// 1. Vue 官方 API
import { computed, onMounted, ref } from 'vue'

// 2. Pinia Store
import { useResourceStore } from '@/stores/resources'
import { useToastStore } from '@/stores/toast'

// 3. 工具函数
import { formatDuration } from '@/utils/format'

// 4. API 接口定义
import { exportResourceConfig, importResourceConfig } from '@/api/resources'

// 5. 子组件导入
import AppAlert from '@/components/base/AppAlert.vue'
import AppConfirm from '@/components/base/AppConfirm.vue'
import AppEmptyState from '@/components/base/AppEmptyState.vue'
import AppLoadingState from '@/components/base/AppLoadingState.vue'
import AppModal from '@/components/base/AppModal.vue'

const resourceStore = useResourceStore()
const toastStore = useToastStore()

const statItems = computed(() => [
  { label: '资源站总数', value: resourceStore.stats.total },
  { label: '已启用', value: resourceStore.stats.enabled },
  { label: '已禁用', value: resourceStore.stats.disabled }
])
const hasTesting = computed(() => Object.values(resourceStore.testingMap).some(Boolean))

// 名称过滤（纯本地过滤，不发请求）
const filterKeyword = ref('')
const filteredSites = computed(() => {
  const keyword = filterKeyword.value.toLowerCase()
  if (!keyword) return resourceStore.sites
  return resourceStore.sites.filter((site) => (site.name || '').toLowerCase().includes(keyword))
})

// 新增/编辑表单状态
const formVisible = ref(false)
const formMode = ref('create')
const submitting = ref(false)
const siteForm = ref(createEmptyForm())

// 删除确认状态
const deleteConfirmVisible = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

// 导入导出状态
const importInputRef = ref(null)
const importing = ref(false)
const exporting = ref(false)

onMounted(() => {
  safeFetchSites()
})

function createEmptyForm() {
  return {
    siteId: '',
    name: '',
    baseUrl: '',
    timeout: 10,
    searchEndpoint: '',
    pageParam: '',
    actionParam: '',
    enabled: true
  }
}

const safeFetchSites = async () => {
  try {
    await resourceStore.fetchSites()
  } catch {
    // 错误状态由 Store 统一维护。
  }
}

const safeToggleSite = async (site) => {
  try {
    await resourceStore.toggleSite(site.site_id)
    toastStore.success(site.enabled ? `已禁用「${site.name}」` : `已启用「${site.name}」`)
  } catch (toggleError) {
    toastStore.error(toggleError.message)
  }
}

const safeTestSite = async (siteId) => {
  try {
    await resourceStore.testSite(siteId)
  } catch {
    // 失败结果已写入测试结果列展示。
  }
}

const safeTestEnabledSites = async () => {
  try {
    const summary = await resourceStore.testEnabledSites()
    toastStore.success(
      `批量测试完成：成功 ${summary?.success_count ?? 0} / 共 ${summary?.total ?? 0}`
    )
  } catch (testError) {
    toastStore.error(testError.message)
  }
}

// ---------- 新增 / 编辑 ----------

const openCreateForm = () => {
  formMode.value = 'create'
  siteForm.value = createEmptyForm()
  formVisible.value = true
}

const openEditForm = (site) => {
  formMode.value = 'edit'
  siteForm.value = {
    siteId: site.site_id,
    name: site.name,
    baseUrl: site.base_url,
    timeout: site.timeout,
    searchEndpoint: site.search_endpoint,
    pageParam: site.page_param,
    actionParam: site.action_param,
    enabled: Boolean(site.enabled)
  }
  formVisible.value = true
}

/**
 * 表单校验：site_id/name/base_url 非空，timeout 为 1-120 的数字
 * @returns {boolean} 是否通过
 */
const validateSiteForm = () => {
  const form = siteForm.value
  if (!form.siteId) {
    toastStore.error('站点 ID 不能为空')
    return false
  }
  if (!form.name) {
    toastStore.error('站点名称不能为空')
    return false
  }
  if (!form.baseUrl) {
    toastStore.error('接口地址不能为空')
    return false
  }
  const timeoutValue = Number(form.timeout)
  if (!Number.isFinite(timeoutValue) || timeoutValue < 1 || timeoutValue > 120) {
    toastStore.error('超时时间必须是 1-120 之间的数字')
    return false
  }
  return true
}

const handleSubmitForm = async () => {
  if (submitting.value) return
  if (!validateSiteForm()) return

  const form = siteForm.value
  const payload = {
    name: form.name,
    base_url: form.baseUrl,
    enabled: form.enabled,
    timeout: Number(form.timeout),
    search_endpoint: form.searchEndpoint,
    page_param: form.pageParam,
    action_param: form.actionParam
  }

  submitting.value = true
  try {
    if (formMode.value === 'create') {
      await resourceStore.createSite({ site_id: form.siteId, ...payload })
      toastStore.success(`已创建站点「${form.name}」`)
    } else {
      await resourceStore.updateSite(form.siteId, payload)
      toastStore.success(`已保存站点「${form.name}」`)
    }
    formVisible.value = false
  } catch (submitError) {
    toastStore.error(submitError.message)
  } finally {
    submitting.value = false
  }
}

// ---------- 删除 ----------

const openDeleteConfirm = (site) => {
  deleteTarget.value = site
  deleteConfirmVisible.value = true
}

const handleConfirmDelete = async () => {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  try {
    await resourceStore.deleteSite(deleteTarget.value.site_id)
    toastStore.success(`已删除站点「${deleteTarget.value.name}」`)
    deleteConfirmVisible.value = false
  } catch (deleteError) {
    toastStore.error(deleteError.message)
  } finally {
    deleting.value = false
  }
}

// ---------- 导出 / 导入 ----------

const handleExportConfig = async () => {
  exporting.value = true
  try {
    const response = await exportResourceConfig()
    const sites = response.data?.sites || []
    const blob = new Blob([JSON.stringify({ sites }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'resource_sites_export.json'
    link.click()
    URL.revokeObjectURL(url)
    toastStore.success(`已导出 ${sites.length} 个站点配置`)
  } catch (exportError) {
    toastStore.error(exportError.message)
  } finally {
    exporting.value = false
  }
}

const triggerImportFile = () => {
  importInputRef.value?.click()
}

const handleImportFileChange = async (event) => {
  const input = event.target
  const file = input.files?.[0]
  if (!file) return

  let sitesData
  try {
    const parsed = JSON.parse(await file.text())
    if (!Array.isArray(parsed?.sites)) {
      throw new Error('缺少 sites 数组')
    }
    sitesData = parsed.sites
  } catch {
    toastStore.error('配置文件解析失败：需要包含 sites 数组的 JSON 文件')
    input.value = ''
    return
  }

  importing.value = true
  try {
    const response = await importResourceConfig(sitesData)
    toastStore.success(
      response.data?.message || `成功导入 ${response.data?.imported_count ?? sitesData.length} 个站点`
    )
    await safeFetchSites()
  } catch (importError) {
    toastStore.error(importError.message)
  } finally {
    importing.value = false
    input.value = ''
  }
}
</script>
