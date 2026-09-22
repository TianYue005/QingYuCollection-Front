<template>
  <div class="circle-join-page">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-title">
        <h2 class="page-title">我的参与</h2>
        <span v-if="!firstLoading" class="page-desc">这里展示你参与过的圈子内容</span>
      </div>
      <span v-if="!firstLoading && total > 0" class="page-count">共 {{ total }} 条</span>
    </div>

    <!-- 分割线 -->
    <div class="header-divider"></div>

    <!-- 分类查看：跑腿任务（我接取的）/ 热门活动（我加入的） -->
    <div class="filter-bar">
      <button
        v-for="opt in viewOptions"
        :key="opt.key"
        class="filter-chip"
        :class="{ 'filter-chip--active': activeView === opt.key }"
        @click="switchView(opt.key)"
      >
        {{ opt.name }}
      </button>
    </div>

    <!-- 首次加载骨架屏 -->
    <div v-if="firstLoading" class="skeleton-list">
      <div v-for="n in 5" :key="n" class="row-skeleton">
        <div class="skeleton-text skeleton-text-long"></div>
        <div class="skeleton-text skeleton-text-short"></div>
      </div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="state-box">
      <div class="state-icon">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="32" cy="32" r="28" />
          <path d="M22 22L42 42M42 22L22 42" stroke-width="2" />
        </svg>
      </div>
      <p class="state-title">加载失败</p>
      <p class="state-desc">{{ error }}</p>
      <button class="retry-btn" @click="fetchList(page)">重新加载</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="list.length === 0" class="state-box">
      <div class="state-icon">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="24" cy="20" r="7" />
          <circle cx="44" cy="24" r="5" />
          <path d="M10 50c2-9 8-14 16-14s13 5 15 14" stroke-linecap="round" />
          <path d="M36 41c1-5 5-8 10-8 5 0 8 3 10 9" stroke-linecap="round" />
        </svg>
      </div>
      <p class="state-title">{{ emptyTitle }}</p>
      <p class="state-desc">{{ emptyDesc }}</p>
      <button class="retry-btn" @click="goBrowse">去逛逛圈子</button>
    </div>

    <!-- 参与列表 -->
    <template v-else>
      <div class="circle-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="circle-row"
          @click="goDetail(item)"
        >
          <!-- 顶部：分类徽章 + 活动状态 -->
          <div class="row-head">
            <span class="cat-badge" :class="`cat-badge--${catKey(item)}`">{{ catName(item) }}</span>
            <span v-if="catKey(item) === 'Event'" class="status-badge" :class="`status-badge--${eventStatus(item)}`">
              {{ statusText(eventStatus(item)) }}
            </span>
          </div>

          <!-- 统一卡片样式：跑腿任务 / 热门活动共用 -->
          <div class="row-title">{{ rowTitle(item) }}</div>
          <div v-if="metaItems(item).length" class="row-meta">
            <span v-for="(meta, i) in metaItems(item)" :key="i" class="meta-item">{{ meta }}</span>
          </div>

          <span class="row-arrow" aria-hidden="true">›</span>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="pageCount > 1" class="pagination">
        <button class="page-btn" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
        <template v-for="p in pageItems" :key="String(p)">
          <span v-if="p === '...'" class="page-ellipsis">…</span>
          <button
            v-else
            :class="['page-btn', 'page-num', { 'page-active': p === page }]"
            :disabled="loading"
            @click="changePage(p)"
          >
            {{ p }}
          </button>
        </template>
        <button class="page-btn" :disabled="page >= pageCount || loading" @click="changePage(page + 1)">下一页</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getActivityStatus, getMyJoinActivity, getMyTakeTask, type Circle } from '@/api/forum'

const router = useRouter()

/* ---- category 文案与跳转 option（与三个模块界面一致） ---- */
const catText: Record<string, string> = {
  Dynamics: '圈子动态',
  Task: '跑腿任务',
  Event: '热门活动',
}
/** category -> 详情路由 option */
const catOption: Record<string, 'Dynamic' | 'Task' | 'Activity'> = {
  Dynamics: 'Dynamic',
  Task: 'Task',
  Event: 'Activity',
}

const statusMap: Record<number, string> = {
  0: '未开始',
  1: '已开始',
  2: '已结束',
}

/* ---- 分类查看按钮：跑腿任务（我接取的）/ 热门活动（我加入的） ---- */
const viewOptions: { key: 'Task' | 'Event'; name: string }[] = [
  { key: 'Task', name: '跑腿任务' },
  { key: 'Event', name: '热门活动' },
]
const activeView = ref<'Task' | 'Event'>('Task')

/** 空状态文案随当前分类变化 */
const emptyTitle = computed(() =>
  activeView.value === 'Task' ? '还没有参与的跑腿任务' : '还没有加入的热门活动',
)
const emptyDesc = computed(() =>
  activeView.value === 'Task'
    ? '去圈子板块看看有没有感兴趣的任务吧'
    : '去圈子板块看看有没有感兴趣的活动吧',
)

/* ---- 列表数据 ---- */
const firstLoading = ref(true)
const loading = ref(false)
const error = ref('')
const list = ref<Circle[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

/** 分页页码窗口（超过 7 页时折叠中间省略号） */
const pageItems = computed<(number | '...')[]>(() => {
  const totalPages = pageCount.value
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const left = Math.max(2, page.value - 1)
  const right = Math.min(totalPages - 1, page.value + 1)
  const items: (number | '...')[] = [1]
  if (left > 2) items.push('...')
  for (let i = left; i <= right; i++) items.push(i)
  if (right < totalPages - 1) items.push('...')
  items.push(totalPages)
  return items
})

/** 归一化分类（兼容未知/缺失分类，归入"其他"） */
function catKey(item: Circle): string {
  const k = item.category || ''
  return catText[k] ? k : ''
}

function catName(item: Circle): string {
  return catText[catKey(item)] ?? '其他'
}

function statusText(status: number): string {
  return statusMap[status] ?? '未知'
}

/** 活动状态：0 未开始，1 已开始，2 已结束（后端不再返回 status，由起止时间推导） */
function eventStatus(item: Circle): number {
  return getActivityStatus(item.startTime, item.endTime)
}

/** 统一卡片标题：按分类取主文案 */
function rowTitle(item: Circle): string {
  return item.title || item.content || item.requestContent || '暂无内容'
}

/** 统一卡片副信息：赏金 / 起止时间 / 参与人数，无内容则不渲染 */
function metaItems(item: Circle): string[] {
  const metas: string[] = []
  if (item.bounty != null) metas.push(`赏金 ${item.bounty}￥`)
  if (item.startTime && item.endTime) {
    metas.push(`${fmtTime(item.startTime)} 至 ${fmtTime(item.endTime)}`)
  } else if (item.createTime) {
    metas.push(fmtTime(item.createTime))
  }
  if (item.numberOfParticipants) metas.push(`${item.numberOfParticipants} 人参与`)
  return metas
}

/** 时间展示格式化：兼容 "yyyy-MM-dd HH:mm:ss" 与 ISO "yyyy-MM-ddTHH:mm:ss"，保留到分钟 */
function fmtTime(v?: string): string {
  if (!v) return ''
  const t = String(v).trim()
  if (!t) return ''
  const [date = '', time = ''] = t.split(/[ T]/)
  return time ? `${date} ${time.slice(0, 5)}` : date
}

const goDetail = (item: Circle) => {
  const option = catOption[catKey(item)]
  if (!option) return
  router.push({ name: 'CircleUpdatesScan', params: { option, id: item.id } })
}

const goBrowse = () => {
  router.push({ name: 'circle' })
}

/* ---- 列表查询：跑腿任务走 /forum/take/myTakeTask，热门活动走 /forum/take/myJoinActivity ---- */

/**
 * 兼容后端不同返回结构的分页解析：
 * 1) Result 包 PageResult（{ code,msg,data:{total,rows} }）
 * 2) data 直接是列表数组（后端没分页包装，如本接口的 List<Circle>）
 * 3) 整包就是 PageResult / 数组
 */
function resolvePage<T>(res: unknown): { total: number; rows: T[] } | undefined {
  if (!res || typeof res !== 'object') return undefined
  const r = res as { data?: unknown; total?: unknown; rows?: unknown; list?: unknown }
  // 找到真正承载列表的容器：data 是数组 -> {rows:data}；data 是对象 -> data；否则退回整包 res
  let inner: unknown
  if (Array.isArray(r.data)) {
    inner = { rows: r.data }
  } else if (r.data && typeof r.data === 'object') {
    inner = r.data
  } else {
    inner = r
  }
  if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return undefined
  const box = inner as Record<string, unknown>
  const rows = Array.isArray(box.rows) ? box.rows : Array.isArray(box.list) ? box.list : undefined
  if (!rows) return undefined
  return { total: Number(box.total ?? rows.length), rows: rows as T[] }
}

async function fetchList(targetPage: number) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    // 两个分类各自对应一个接口；两者都未返回 category，需前端按当前分类补齐，供徽章与详情跳转使用
    const isTask = activeView.value === 'Task'
    const res = isTask
      ? await getMyTakeTask({ pageNumber: targetPage, pageSize })
      : await getMyJoinActivity({ pageNumber: targetPage, pageSize })
    const p = resolvePage<Circle>(res)
    if (p) {
      page.value = targetPage
      total.value = p.total
      list.value = p.rows.map((item) => ({ ...item, category: isTask ? 'Task' : 'Event' }))
    } else {
      error.value = (res as { msg?: string })?.msg || '加载失败，请稍后重试'
      list.value = []
    }
  } catch (e: any) {
    error.value = e?.message || '网络异常，请稍后重试'
    list.value = []
  } finally {
    loading.value = false
    firstLoading.value = false
  }
}

/** 切换查看分类：重置分页与列表，重新拉取对应接口 */
function switchView(key: 'Task' | 'Event') {
  if (activeView.value === key) return
  activeView.value = key
  list.value = []
  page.value = 1
  total.value = 0
  firstLoading.value = true
  fetchList(1)
}

function changePage(targetPage: number) {
  if (loading.value || targetPage < 1 || targetPage > pageCount.value) return
  fetchList(targetPage)
}

onMounted(() => {
  fetchList(1)
})
</script>

<style scoped>
.circle-join-page {
  padding: 0 0 48px;
}

/* ===== 头部 ===== */
.page-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.page-title {
  font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.17;
  letter-spacing: 0.216px;
  color: #1d1d1f;
  margin: 0;
  flex-shrink: 0;
}

.page-desc {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.374px;
  color: #86868b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-count {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.374px;
  color: #86868b;
  flex-shrink: 0;
}

.header-divider {
  height: 1px;
  background: #d2d2d7;
  margin: 12px 0 24px;
}

/* ===== 分类查看 ===== */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-chip {
  padding: 7px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 9999px;
  background: #ffffff;
  color: #1d1d1f;
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.filter-chip:hover {
  border-color: #0066cc;
  color: #0066cc;
}

.filter-chip--active {
  background: #0066cc;
  border-color: #0066cc;
  color: #ffffff;
}

.filter-chip--active:hover {
  background: #0071e3;
  border-color: #0071e3;
  color: #ffffff;
}

/* ===== 圈子列表 ===== */
.circle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.circle-row {
  padding: 18px 44px 18px 20px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.circle-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

/* 徽章行 */
.row-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

/* 分类徽章：Dynamics / Task / Event 三种配色区分 */
.cat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 10px;
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.12px;
  border-radius: 9999px;
  white-space: nowrap;
}

.cat-badge--Dynamics {
  color: #0066cc;
  background: rgba(0, 102, 204, 0.1);
}

.cat-badge--Task {
  color: #b25000;
  background: rgba(255, 149, 0, 0.16);
}

.cat-badge--Event {
  color: #1d8a3e;
  background: rgba(29, 138, 62, 0.12);
}

/* 活动状态 */
.status-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 9999px;
  background: #e8f2ff;
  color: #0066cc;
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.12px;
  white-space: nowrap;
}

.status-badge--0 {
  background: #f5f5f7;
  color: #7a7a7a;
}

.status-badge--2 {
  background: #f0f0f3;
  color: #86868b;
}

/* ===== 统一卡片样式（跑腿任务 / 热门活动共用） ===== */
.row-title {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
  color: #1d1d1f;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.row-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  min-height: 18px;
}

.meta-item {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.2px;
  color: #7a7a7a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 右侧箭头 */
.circle-row {
  position: relative;
}

.row-arrow {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  font-size: 24px;
  font-weight: 300;
  line-height: 1;
  color: #c7c7cc;
  transition:
    color 0.2s ease,
    right 0.2s ease;
}

.circle-row:hover .row-arrow {
  color: #0066cc;
  right: 12px;
}

/* ===== 骨架屏 ===== */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  background: #ffffff;
  border-radius: 14px;
}

.skeleton-text {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #e8e8ed 25%, #f0f0f5 50%, #e8e8ed 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text-long {
  width: 70%;
}

.skeleton-text-short {
  width: 40%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ===== 空状态 / 错误状态 ===== */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  text-align: center;
}

.state-icon {
  width: 80px;
  height: 80px;
  color: #c0c0c0;
  margin-bottom: 24px;
}

.state-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.state-title {
  margin: 0 0 8px;
  font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.231px;
  color: #1d1d1f;
}

.state-desc {
  margin: 0;
  font-size: 15px;
  color: #7a7a7a;
}

.retry-btn {
  margin-top: 20px;
  padding: 8px 24px;
  border: none;
  border-radius: 9999px;
  background: #0066cc;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.retry-btn:hover {
  background: #0071e3;
}

/* ===== 分页 ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 28px 0 8px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d2d2d7;
  border-radius: 9999px;
  background: #ffffff;
  color: #1d1d1f;
  font-size: 14px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.page-btn:hover:not(:disabled):not(.page-active) {
  border-color: #0071e3;
  color: #0071e3;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-active {
  border-color: #0071e3;
  background: #0071e3;
  color: #ffffff;
}

.page-ellipsis {
  padding: 0 2px;
  color: #86868b;
  user-select: none;
}
</style>
