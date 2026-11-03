<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { banUser, selectReport, type BanTimeUnit, type ReportVO } from '@/api/admin'
import { toast } from '@/utils/message'

/**
 * 管理后台 - 举报处理
 * 点击左上角按钮后从左侧弹出举报分类抽屉，切换后展示对应列表
 * 分类 type 与 ReportDTO.type 保持一致（0~9）
 */
interface ReportCategory {
  key: string
  label: string
  type: number
  desc: string
}

interface AdminReportItem {
  id: string
  /** 被举报内容（后端 report） */
  content: string
  /** 举报原因（后端 reason） */
  reason: string
  /** 举报人 id（后端 uId） */
  reporter: string
  /** 被举报对象 id（后端 reportId） */
  reportId: string
  /** 被举报对象所在页面的 id（后端 objectId） */
  objectId: string
  /** 举报类型（后端 type） */
  type: number
}

const categories: ReportCategory[] = [ 
  { key: 'goods', label: '商品举报', type: 1, desc: '处理用户对校园市场商品的举报' },
  { key: 'goodsComment', label: '商品评论举报', type: 0, desc: '处理用户对商品评论的举报' },
  { key: 'teamUp', label: '组团举报', type: 2, desc: '处理用户对组团的举报' },
  { key: 'teamUpComment', label: '组团评论举报', type: 3, desc: '处理用户对组团发言的举报' },
  { key: 'circle', label: '圈子举报', type: 4, desc: '处理用户对圈子动态的举报' },
  { key: 'circleComment', label: '圈子评论举报', type: 5, desc: '处理用户对圈子动态评论的举报' },
  { key: 'task', label: '跑腿任务举报', type: 6, desc: '处理用户对跑腿任务的举报' },
  { key: 'taskComment', label: '跑腿任务评论举报', type: 7, desc: '处理用户对跑腿任务评论的举报' },
  { key: 'activity', label: '活动举报', type: 8, desc: '处理用户对热门活动的举报' },
  { key: 'activityComment', label: '活动评论举报', type: 9, desc: '处理用户对热门活动评论的举报' },
]

const activeKey = ref(categories[0]!.key)
const activeCategory = computed(
  () => categories.find((item) => item.key === activeKey.value) ?? categories[0]!,
)

/** 举报列表（后端 /api/admin/select/goods 分页返回） */
const reports = ref<AdminReportItem[]>([])
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const loadError = ref('')
/** 后端不返回总数，本页取满 pageSize 即认为还有下一页 */
const hasNext = ref(false)

const emptyTitle = computed(() => {
  if (loading.value) return '正在加载举报记录'
  if (loadError.value) return '举报记录加载失败'
  return '暂无举报记录'
})

const emptyDesc = computed(() => {
  if (loading.value) return '请稍候…'
  if (loadError.value) return `${loadError.value}，可点击右上角刷新重试`
  return '该分类下暂时没有查到举报记录'
})

const mapReport = (item: ReportVO, index: number, type: number): AdminReportItem => ({
  // 后端 ReportVO 未下发主键，用“类型-页码-下标”兜底
  id: `${type}-${page.value}-${index}`,
  content: item.report || '',
  reason: item.reason || '',
  reporter: item.uId ? String(item.uId) : '',
  reportId: item.reportId ? String(item.reportId) : '',
  objectId: item.objectId ? String(item.objectId) : '',
  type: item.type ?? type,
})

const router = useRouter()

/** 举报类型 -> 目标详情页路由，objectId 即目标页面 id */
type JumpTarget = { name: string; params: Record<string, string> }

const jumpTargets: Record<number, (id: string) => JumpTarget> = {
  // 商品评论 / 商品 -> 商品详情
  0: (id) => ({ name: 'item', params: { id } }),
  1: (id) => ({ name: 'item', params: { id } }),
  // 组团 / 组团发言 -> 组团详情
  2: (id) => ({ name: 'TeamUpScan', params: { id } }),
  3: (id) => ({ name: 'TeamUpScan', params: { id } }),
  // 圈子动态 / 圈子动态评论 -> 圈子动态详情
  4: (id) => ({ name: 'CircleUpdatesScan', params: { option: 'Dynamic', id } }),
  5: (id) => ({ name: 'CircleUpdatesScan', params: { option: 'Dynamic', id } }),
  // 跑腿任务 / 跑腿任务评论 -> 跑腿任务详情
  6: (id) => ({ name: 'CircleUpdatesScan', params: { option: 'Task', id } }),
  7: (id) => ({ name: 'CircleUpdatesScan', params: { option: 'Task', id } }),
  // 热门活动 / 热门活动评论 -> 热门活动详情
  8: (id) => ({ name: 'CircleUpdatesScan', params: { option: 'Activity', id } }),
  9: (id) => ({ name: 'CircleUpdatesScan', params: { option: 'Activity', id } }),
}

/** 有 objectId 且类型可识别时才允许跳转 */
const canJump = (item: AdminReportItem) => Boolean(item.objectId && jumpTargets[item.type])

/** 按举报类型跳转到被举报内容所在页面 */
const jumpToTarget = (item: AdminReportItem) => {
  if (!item.objectId) {
    toast.error('该举报缺少目标对象 id，无法跳转')
    return
  }
  const build = jumpTargets[item.type]
  if (!build) {
    toast.error('未知的举报类型，无法跳转')
    return
  }
  router.push(build(item.objectId))
}

/** 封号可选时长（time + unit 对应后端 Ban） */
const banOptions: { key: string; label: string; time: number; unit: BanTimeUnit }[] = [
  { key: '1h', label: '1 小时', time: 1, unit: 'HOURS' },
  { key: '1d', label: '一天', time: 1, unit: 'DAYS' },
  { key: '7d', label: '7 天', time: 7, unit: 'DAYS' },
  { key: '1m', label: '一月', time: 30, unit: 'DAYS' },
]

type BanOption = (typeof banOptions)[number]

/** 当前展开封号菜单的举报 id */
const banMenuId = ref<string | null>(null)

/** 正在提交封号请求的举报 id */
const banningId = ref<string | null>(null)

const toggleBanMenu = (item: AdminReportItem) => {
  banMenuId.value = banMenuId.value === item.id ? null : item.id
}

/** 封号：填写详细原因后调用 /api/admin/ban */
const handleBan = async (item: AdminReportItem, option: BanOption) => {
  banMenuId.value = null
  if (banningId.value) return

  let cause = ''
  try {
    const { value } = await ElMessageBox.prompt(
      `将封禁用户 ${item.reporter || '—'} ${option.label}，请填写详细原因`,
      '封号',
      {
        confirmButtonText: '确定封号',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入封号的详细原因',
        inputValidator: (val: string) => (val?.trim() ? true : '请填写封号的详细原因'),
        type: 'warning',
      },
    )
    cause = value.trim()
  } catch {
    // 用户取消
    return
  }

  banningId.value = item.id
  try {
    const res = await banUser({ time: option.time, unit: option.unit, cause })
    if (res.code === 1) {
      toast.success(`已封号：用户 ${item.reporter || '—'}，时长 ${option.label}`)
    } else {
      toast.error(res.msg || '封号失败')
    }
  } catch (e: any) {
    toast.error(e?.message || '封号失败，请稍后重试')
  } finally {
    banningId.value = null
  }
}

/** 删除被举报内容：后端接口尚未提供，先保留交互入口 */
const handleDelete = (item: AdminReportItem) => {
  toast.info(`删除举报内容：${item.content || '—'}（接口待接入）`)
}

/** 查询当前分类的举报（select 对应后端 ReportDTO.type） */
const fetchReports = async () => {
  loading.value = true
  loadError.value = ''
  banMenuId.value = null
  const type = activeCategory.value.type
  try {
    const res = await selectReport({
      select: type,
      pageNumber: page.value,
      pageSize,
    })
    if (res.code === 1) {
      const rows = res.data ?? []
      reports.value = rows.map((item, index) => mapReport(item, index, type))
      hasNext.value = rows.length === pageSize
    } else {
      reports.value = []
      hasNext.value = false
      loadError.value = res.msg || '举报记录加载失败'
      toast.error(loadError.value)
    }
  } catch (e: any) {
    reports.value = []
    hasNext.value = false
    loadError.value = e?.message || '网络异常，请稍后重试'
    toast.error(loadError.value)
  } finally {
    loading.value = false
  }
}

/** 刷新当前页 */
const refreshReports = () => {
  if (loading.value) return
  fetchReports()
}

const goPrevPage = () => {
  if (page.value <= 1 || loading.value) return
  page.value--
  fetchReports()
}

const goNextPage = () => {
  if (!hasNext.value || loading.value) return
  page.value++
  fetchReports()
}

/** 切换分类时重置页码并重新查询 */
const selectCategory = (key: string) => {
  activeKey.value = key
  page.value = 1
  fetchReports()
}

/** 左侧分类抽屉展开状态 */
const sidebarOpen = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)
const toggleRef = ref<HTMLButtonElement | null>(null)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const chooseCategory = (key: string) => {
  selectCategory(key)
  sidebarOpen.value = false
}

/** 点击抽屉、切换按钮、封号菜单以外的区域时收起对应浮层 */
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.admin-manage__ban')) banMenuId.value = null
  if (!sidebarOpen.value) return
  if (sidebarRef.value?.contains(target) || toggleRef.value?.contains(target)) return
  sidebarOpen.value = false
}

/** 按 Esc 收起抽屉与封号菜单 */
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  sidebarOpen.value = false
  banMenuId.value = null
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
  fetchReports()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="admin-manage">
    <!-- 左侧分类抽屉 -->
    <aside
      ref="sidebarRef"
      class="admin-manage__side"
      :class="{ 'is-open': sidebarOpen }"
      :aria-hidden="!sidebarOpen"
    >
      <div class="admin-manage__side-header">
        <span class="admin-manage__side-title">举报分类</span>
        <span class="admin-manage__side-count">{{ categories.length }} 类</span>
      </div>
      <nav class="admin-manage__side-nav">
        <button
          v-for="category in categories"
          :key="category.key"
          type="button"
          class="admin-manage__side-item"
          :class="{ 'is-active': category.key === activeKey }"
          @click="chooseCategory(category.key)"
        >
          <span>{{ category.label }}</span>
          <svg
            v-if="category.key === activeKey"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m5 12 5 5 9-9" />
          </svg>
        </button>
      </nav>
    </aside>

    <main class="admin-manage__content">
      <header class="admin-manage__header">
        <div class="admin-manage__header-left">
          <button
            ref="toggleRef"
            type="button"
            class="admin-manage__toggle"
            :aria-expanded="sidebarOpen"
            aria-label="切换举报分类"
            @click="toggleSidebar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </svg>
          </button>
          <div>
            <h1 class="admin-manage__title">举报处理</h1>
            <p class="admin-manage__desc">{{ activeCategory.desc }}</p>
          </div>
        </div>
        <button type="button" class="admin-manage__refresh" @click="refreshReports">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          刷新
        </button>
      </header>

      <section class="admin-manage__panel">
        <!-- 列表 -->
        <div class="admin-manage__table">
          <div class="admin-manage__table-head">
            <span class="col-content">举报内容</span>
            <span class="col-reason">举报原因</span>
            <span class="col-action">操作</span>
          </div>

          <div v-if="reports.length === 0" class="admin-manage__empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3 4 6.5v5.2c0 4.6 3.2 8.5 8 9.3 4.8-.8 8-4.7 8-9.3V6.5L12 3z" />
              <path d="M12 9v4" />
              <path d="M12 16.5h.01" />
            </svg>
            <p class="admin-manage__empty-title">{{ emptyTitle }}</p>
            <p class="admin-manage__empty-desc">{{ emptyDesc }}</p>
          </div>

          <ul v-else class="admin-manage__list">
            <li v-for="item in reports" :key="item.id" class="admin-manage__row">
              <span class="col-content" :title="item.content">{{ item.content || '—' }}</span>
              <span class="col-reason" :title="item.reason">{{ item.reason || '—' }}</span>
              <span class="col-action">
                <div class="admin-manage__actions">
                  <div class="admin-manage__ban">
                    <button
                      type="button"
                      class="admin-manage__action"
                      :aria-expanded="banMenuId === item.id"
                      :disabled="banningId === item.id"
                      @click="toggleBanMenu(item)"
                    >
                      {{ banningId === item.id ? '封号中…' : '封号' }}
                    </button>
                    <ul v-if="banMenuId === item.id" class="admin-manage__ban-menu">
                      <li v-for="option in banOptions" :key="option.key">
                        <button type="button" @click="handleBan(item, option)">
                          {{ option.label }}
                        </button>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    class="admin-manage__action is-danger"
                    @click="handleDelete(item)"
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    class="admin-manage__action"
                    :disabled="!canJump(item)"
                    :title="
                      canJump(item) ? '跳转到被举报内容所在页面' : '缺少目标对象 id，无法跳转'
                    "
                    @click="jumpToTarget(item)"
                  >
                    跳转
                  </button>
                </div>
              </span>
            </li>
          </ul>
        </div>

        <footer class="admin-manage__footer">
          <span>本页 {{ reports.length }} 条举报</span>
          <div class="admin-manage__pager">
            <button
              type="button"
              class="admin-manage__pager-btn"
              :disabled="page <= 1 || loading"
              @click="goPrevPage"
            >
              上一页
            </button>
            <span class="admin-manage__pager-info">第 {{ page }} 页</span>
            <button
              type="button"
              class="admin-manage__pager-btn"
              :disabled="!hasNext || loading"
              @click="goNextPage"
            >
              下一页
            </button>
          </div>
        </footer>
      </section>
    </main>
  </div>
</template>

<style scoped>
.admin-manage {
  min-height: 100vh;
  background-color: var(--color-canvas-parchment);
}

/* ===== 左侧分类抽屉 ===== */
.admin-manage__side {
  position: fixed;
  top: 16px;
  bottom: 16px;
  left: 16px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  width: 300px;
  max-width: calc(100vw - 32px);
  padding: 64px 10px 12px;
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-lg);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
  transform: translateX(calc(-100% - 24px));
  visibility: hidden;
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 0.28s;
}

.admin-manage__side.is-open {
  transform: translateX(0);
  visibility: visible;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.admin-manage__side-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 4px 12px 10px;
  border-bottom: 1px solid var(--color-divider-soft);
}

.admin-manage__side-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-ink);
}

.admin-manage__side-count {
  font-size: 12px;
  color: var(--color-ink-muted-48);
}

.admin-manage__side-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 10px;
  overflow-y: auto;
}

.admin-manage__side-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  width: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  border-radius: var(--rounded-sm);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.4;
  letter-spacing: -0.2px;
  color: var(--color-ink-muted-80);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.admin-manage__side-item:hover {
  background-color: var(--color-surface-pearl);
  color: var(--color-ink);
}

.admin-manage__side-item.is-active {
  background-color: rgba(0, 102, 204, 0.08);
  color: var(--color-primary);
  font-weight: 600;
}

.admin-manage__side-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.admin-manage__side-item svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* ===== 内容区 ===== */
.admin-manage__content {
  padding: var(--spacing-xl);
}

.admin-manage__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.admin-manage__header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.admin-manage__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 24px;
  left: 24px;
  z-index: 70;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  padding: 0;
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-sm);
  color: var(--color-ink-muted-80);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.admin-manage__toggle svg {
  width: 19px;
  height: 19px;
}

.admin-manage__toggle:hover {
  background-color: var(--color-surface-pearl);
  color: var(--color-ink);
}

.admin-manage__toggle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.admin-manage__header-left > div {
  padding-left: 54px;
}

.admin-manage__title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: 0;
  color: var(--color-ink);
}

.admin-manage__desc {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.4;
  letter-spacing: -0.2px;
  color: var(--color-ink-muted-48);
}

.admin-manage__refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  flex-shrink: 0;
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-pill);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-ink-muted-80);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.admin-manage__refresh svg {
  width: 15px;
  height: 15px;
}

.admin-manage__refresh:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.admin-manage__refresh:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ===== 面板 ===== */
.admin-manage__panel {
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-lg);
}

/* ===== 表格 ===== */
.admin-manage__table {
  min-height: 360px;
}

.admin-manage__table-head,
.admin-manage__row {
  display: grid;
  grid-template-columns: 3fr 2fr auto;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 20px;
}

.admin-manage__table-head {
  height: 44px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.12px;
  color: var(--color-ink-muted-48);
  background-color: var(--color-surface-pearl);
  border-bottom: 1px solid var(--color-divider-soft);
  border-radius: var(--rounded-lg) var(--rounded-lg) 0 0;
}

.admin-manage__list {
  list-style: none;
}

.admin-manage__row {
  height: 56px;
  font-size: 14px;
  color: var(--color-ink-muted-80);
  border-bottom: 1px solid var(--color-divider-soft);
}

.admin-manage__row:hover {
  background-color: var(--color-surface-pearl);
}

.col-content,
.col-reason {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.col-action {
  display: flex;
  justify-content: flex-end;
}

.admin-manage__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 封号下拉菜单 */
.admin-manage__ban {
  position: relative;
}

.admin-manage__ban-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 104px;
  padding: 4px;
  list-style: none;
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-sm);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.admin-manage__ban-menu button {
  display: block;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: var(--rounded-xs);
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-ink-muted-80);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.admin-manage__ban-menu button:hover {
  background-color: var(--color-surface-pearl);
  color: var(--color-ink);
}

.admin-manage__ban-menu button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.admin-manage__action {
  height: 28px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--rounded-pill);
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-primary);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.admin-manage__action:hover:not(:disabled) {
  background-color: rgba(0, 102, 204, 0.08);
}

.admin-manage__action.is-danger {
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.admin-manage__action.is-danger:hover:not(:disabled) {
  background-color: rgba(255, 59, 48, 0.08);
}

.admin-manage__action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.admin-manage__action:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ===== 空状态 ===== */
.admin-manage__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 72px 20px;
  text-align: center;
}

.admin-manage__empty svg {
  width: 44px;
  height: 44px;
  color: var(--color-surface-chip-translucent);
  margin-bottom: var(--spacing-sm);
}

.admin-manage__empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-ink-muted-80);
}

.admin-manage__empty-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-ink-muted-48);
}

/* ===== 底部 ===== */
.admin-manage__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: 14px 20px;
  border-top: 1px solid var(--color-divider-soft);
  font-size: 13px;
  color: var(--color-ink-muted-48);
}

.admin-manage__pager {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.admin-manage__pager-btn {
  height: 28px;
  padding: 0 14px;
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-pill);
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-ink-muted-80);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.admin-manage__pager-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.admin-manage__pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.admin-manage__pager-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .admin-manage__content {
    padding: var(--spacing-md);
  }

  .admin-manage__table-head,
  .admin-manage__row {
    grid-template-columns: 1fr;
    gap: 2px;
    padding: 10px 16px;
  }

  .admin-manage__table-head {
    display: none;
  }

  .admin-manage__row {
    height: auto;
  }

  .col-action {
    justify-content: flex-start;
    padding-top: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-manage__side,
  .admin-manage__side.is-open,
  .admin-manage__refresh,
  .admin-manage__toggle,
  .admin-manage__side-item,
  .admin-manage__action,
  .admin-manage__ban-menu button,
  .admin-manage__pager-btn {
    transition: none;
  }
}
</style>
