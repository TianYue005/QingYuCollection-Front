<template>
  <div class="teamup-join-page">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-title">
        <h2 class="page-title">我的参与</h2>
        <span v-if="!firstLoading" class="page-desc">这里展示你参与过的组团活动</span>
      </div>
      <span v-if="!firstLoading && total > 0" class="page-count">共 {{ total }} 场</span>
    </div>

    <!-- 分割线 -->
    <div class="header-divider"></div>

    <!-- 首次加载骨架屏 -->
    <div v-if="firstLoading" class="skeleton-list">
      <div v-for="n in 5" :key="n" class="row-skeleton">
        <div class="skeleton-line"></div>
        <div class="skeleton-lines">
          <div class="skeleton-text skeleton-text-long"></div>
          <div class="skeleton-text skeleton-text-short"></div>
        </div>
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
          <path d="M24 4v6M18 8l4 4 4-4M40 6v4M36 8h8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <p class="state-title">还没有参与的组团</p>
      <p class="state-desc">去校园论坛看看有趣的组团，加入一起玩吧</p>
      <button class="retry-btn" @click="goBrowse">去逛逛组团</button>
    </div>

    <!-- 组团列表 -->
    <template v-else>
      <div class="teamup-list">
        <div v-for="item in list" :key="item.id" class="teamup-card" @click="goDetail(item)">
          <!-- 类型徽章 -->
          <span class="teamup-type">{{ typeNameOf(item.type) }}</span>
          <div class="teamup-main">
            <span class="teamup-title">{{ item.title || '未命名组团' }}</span>
            <span class="teamup-meta">
              <template v-if="item.leaderName || item.leader">团长 {{ leaderTextOf(item) }}</template>
              <template v-if="item.startTime">&nbsp;·&nbsp;开始 {{ fmtTime(item.startTime) }}</template>
            </span>
          </div>
          <span class="teamup-arrow" aria-hidden="true">›</span>
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
import { getMyJoin, type TeamUp } from '@/api/forum'

const router = useRouter()

/* ---- 组团类型字典（与后端 type key 对齐） ---- */
const typeMap: Record<string, string> = {
  study: '自习',
  movie: '电影',
  dinner: '聚餐',
  carpool: '拼车',
  order: '拼单',
  game: '游戏',
  sport: '运动',
  travel: '旅行',
  other: '其他',
}

/* ---- 列表数据 ---- */
const firstLoading = ref(true)
const loading = ref(false)
const error = ref('')
const list = ref<TeamUp[]>([])
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

/** 类型 key 转中文名（未知 key 原样展示） */
function typeNameOf(type?: string): string {
  return (type && typeMap[type]) || type || '其他'
}

/** 团长展示：优先昵称，缺失时退回 ID */
function leaderTextOf(item: TeamUp): string {
  return item.leaderName || String(item.leader ?? '')
}

/** 时间展示格式化：保留到分钟，非法/空值返回空串 */
function fmtTime(v?: string): string {
  if (!v) return ''
  const t = String(v).trim()
  if (!t) return ''
  const [date = '', time = ''] = t.split(' ')
  return time ? `${date} ${time.slice(0, 5)}` : date
}

const goDetail = (item: TeamUp) => {
  router.push({ name: 'TeamUpScan', params: { id: item.id } })
}

const goBrowse = () => {
  router.push({ name: 'teamup' })
}

/* ---- 列表查询：/forum/myJoin 返回我参与的组团 ---- */

/**
 * 兼容后端不同返回结构的分页解析：
 * 1) Result 包 PageResult（{ code,msg,data:{total,rows} }）
 * 2) data 直接是列表数组（后端没分页包装）
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
    const res = await getMyJoin({ pageNumber: targetPage, pageSize })
    const p = resolvePage<TeamUp>(res)
    if (p) {
      page.value = targetPage
      total.value = p.total
      list.value = p.rows
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

function changePage(targetPage: number) {
  if (loading.value || targetPage < 1 || targetPage > pageCount.value) return
  fetchList(targetPage)
}

onMounted(() => {
  fetchList(1)
})
</script>

<style scoped>
.teamup-join-page {
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

/* ===== 组团列表 ===== */
.teamup-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.teamup-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.teamup-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

/* 类型徽章 */
.teamup-type {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 28px;
  padding: 4px 12px;
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.12px;
  color: #0066cc;
  background: rgba(0, 102, 204, 0.08);
  border-radius: 9999px;
  white-space: nowrap;
}

/* 卡片主体 */
.teamup-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.teamup-title {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teamup-meta {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.2px;
  color: #7a7a7a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右侧箭头 */
.teamup-arrow {
  flex-shrink: 0;
  font-size: 26px;
  font-weight: 300;
  line-height: 1;
  color: #c7c7cc;
  transition: color 0.2s ease, transform 0.2s ease;
}

.teamup-card:hover .teamup-arrow {
  color: #0066cc;
  transform: translateX(3px);
}

/* ===== 骨架屏 ===== */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row-skeleton {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: #ffffff;
  border-radius: 14px;
}

.skeleton-line {
  flex-shrink: 0;
  width: 52px;
  height: 28px;
  border-radius: 9999px;
  background: linear-gradient(90deg, #e8e8ed 25%, #f0f0f5 50%, #e8e8ed 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
