<template>
  <div class="credit-page">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-title">
        <h2 class="page-title">评价</h2>
      </div>
      <span v-if="!firstLoading && total > 0" class="page-count">共 {{ total }} 条</span>
    </div>

    <!-- 分割线 -->
    <div class="header-divider"></div>

    <!-- 筛选：来源 + 好评/差评 -->
    <div class="filter-bar">
      <div class="filter-group">
        <button
          v-for="opt in targetOptions"
          :key="opt.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': target === opt.value }"
          @click="switchTarget(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="filter-group">
        <button
          v-for="opt in traitOptions"
          :key="opt.value"
          class="filter-chip"
          :class="{ 'filter-chip--active': trait === opt.value }"
          @click="switchTrait(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 首次加载骨架屏 -->
    <div v-if="firstLoading" class="skeleton-list">
      <div v-for="n in 3" :key="n" class="row-skeleton">
        <div class="skeleton-text skeleton-text-short"></div>
        <div class="skeleton-text skeleton-text-long"></div>
        <div class="skeleton-text skeleton-text-mid"></div>
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
      <button class="retry-btn" @click="fetchList(1)">重新加载</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="list.length === 0" class="state-box">
      <div class="state-icon">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M32 8l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L32 41.2 19 48l2.5-14.5L11 23.3l14.5-2.1L32 8z" />
        </svg>
      </div>
      <p class="state-title">{{ emptyTitle }}</p>
      <p class="state-desc">{{ emptyDesc }}</p>
    </div>

    <!-- 评价列表 -->
    <template v-else>
      <div class="review-list">
        <div v-for="item in list" :key="item.id" class="review-card">
          <!-- 评价人 / 被评价人 -->
          <div class="review-head">
            <img class="review-avatar" :src="resolveAvatar(oppositeAvatar(item))" alt="头像" />
            <div class="review-user">
              <div class="review-name-row">
                <span class="review-name">{{ oppositeName(item) || '匿名用户' }}</span>
                <span class="review-role">{{ oppositeRole }}</span>
                <span class="trait-tag" :class="isGood(item) ? 'trait-tag--good' : 'trait-tag--bad'">
                  {{ isGood(item) ? '好评' : '差评' }}
                </span>
              </div>
              <span class="review-time">{{ item.createTime || '' }}</span>
            </div>
            <div class="review-score">
              <el-rate :model-value="Number(item.score) || 0" disabled :max="5" size="small" />
              <span class="score-text">{{ Number(item.score) || 0 }} 分</span>
            </div>
          </div>

          <!-- 评价内容 -->
          <p class="review-content">{{ item.content || '未填写评价内容' }}</p>

          <!-- 关联商品：点击进入商品详情 -->
          <div v-if="item.goodsId" class="review-goods" @click="goItem(item.goodsId)">
            <img v-if="item.goodsImgUrl" class="goods-img" :src="item.goodsImgUrl" alt="商品图片" />
            <div v-else class="goods-img goods-img--placeholder">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="12" width="36" height="26" rx="3" />
                <path d="M6 20h36M17 20v-5a7 7 0 0 1 14 0v5" />
              </svg>
            </div>
            <span class="goods-desc">{{ item.goodsDesc || '相关商品' }}</span>
            <span class="goods-arrow" aria-hidden="true">›</span>
          </div>
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
import { getReviewList, type EvaluateVO } from '@/api/user'
import { resolveAvatar } from '@/utils/avatar'

const router = useRouter()

/* ---- 筛选条件 ---- */
const targetOptions = [
  { label: '我评价的', value: 0 },
  { label: '评价我的', value: 1 },
]
const traitOptions = [
  { label: '全部', value: 0 },
  { label: '好评', value: 1 },
  { label: '差评', value: 2 },
]

/** 0=我评价别人的 1=别人评价我的 */
const target = ref(0)
/** 0=全部 1=好评 2=差评 */
const trait = ref(0)

/* ---- 列表数据 ---- */
const firstLoading = ref(true)
const loading = ref(false)
const error = ref('')
const list = ref<EvaluateVO[]>([])
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

const emptyTitle = computed(() => (target.value === 0 ? '你还没有发出评价' : '还没有收到评价'))
const emptyDesc = computed(() =>
  target.value === 0
    ? '交易完成后，别忘了给交易对方一个评价'
    : '完成交易并获得对方的评价后，会展示在这里',
)

/** 评价对象：我评价的看被评价人，别人评价我的看评价人 */
function oppositeName(item: EvaluateVO): string {
  return target.value === 0 ? item.evaluatedName : item.evaluatorName
}
function oppositeAvatar(item: EvaluateVO): string {
  return target.value === 0 ? item.evaluatedAvatar : item.evaluatorAvatar
}
const oppositeRole = computed(() => (target.value === 0 ? '被评价人' : '评价人'))

/** 后端 trait 口径：score>=4 为好评，<=3 为差评 */
const isGood = (item: EvaluateVO) => (Number(item.score) || 0) >= 4

const goItem = (goodsId: number | string) => {
  if (!goodsId) return
  router.push({ name: 'item', params: { id: String(goodsId) } })
}

/**
 * 兼容后端两种返回结构：
 * - Result 包装：{ code, msg, data: { total, rows } }
 * - 直接返回 PageResult：{ total, rows }
 */
function resolvePage(res: unknown): { total: number; rows: EvaluateVO[] } | null {
  if (!res || typeof res !== 'object') return null
  const r = res as { data?: unknown; total?: number; rows?: unknown }
  if (Array.isArray(r.rows)) {
    return { total: Number(r.total ?? r.rows.length), rows: r.rows as EvaluateVO[] }
  }
  const data = r.data as { total?: number; rows?: unknown } | undefined
  if (data && Array.isArray(data.rows)) {
    return { total: Number(data.total ?? data.rows.length), rows: data.rows as EvaluateVO[] }
  }
  return null
}

/* ---- 列表查询：/user/review ---- */
async function fetchList(targetPage = page.value) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await getReviewList({
      target: target.value,
      // trait=0 表示全部，不传给后端
      trait: trait.value > 0 ? trait.value : undefined,
      pageNumber: targetPage,
      pageSize,
    })
    const pageData = resolvePage(res)
    if (pageData) {
      page.value = targetPage
      total.value = pageData.total
      list.value = pageData.rows
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

function switchTarget(value: number) {
  if (target.value === value) return
  target.value = value
  fetchList(1)
}

function switchTrait(value: number) {
  if (trait.value === value) return
  trait.value = value
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
.credit-page {
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
  margin: 12px 0 20px;
}

/* ===== 筛选 ===== */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  background-color: #ffffff;
  color: #1d1d1f;
  border: 1px solid #e0e0e0;
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  border-radius: 9999px;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.filter-chip:hover {
  border-color: #0066cc;
  color: #0066cc;
}

.filter-chip--active {
  border-color: #0071e3;
  background: #0071e3;
  color: #ffffff;
  font-weight: 600;
}

.filter-chip--active:hover {
  color: #ffffff;
}

/* ===== 评价列表 ===== */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-card {
  padding: 18px 20px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

/* 头部：头像 + 用户 + 评分 */
.review-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  background: #f0f0f3;
}

.review-user {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.review-name {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-role {
  font-size: 12px;
  color: #86868b;
}

.trait-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.trait-tag--good {
  color: #1d8a3e;
  background: rgba(29, 138, 62, 0.12);
}

.trait-tag--bad {
  color: #b25000;
  background: rgba(255, 149, 0, 0.16);
}

.review-time {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.2px;
  color: #7a7a7a;
}

.review-score {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.score-text {
  font-size: 12px;
  color: #86868b;
}

/* 评价内容 */
.review-content {
  margin: 14px 0 0;
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  color: #1d1d1f;
  word-break: break-word;
}

/* 关联商品 */
.review-goods {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f5f5f7;
  cursor: pointer;
  transition: background 0.15s ease;
}

.review-goods:hover {
  background: #ebebf0;
}

.goods-img {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 8px;
  object-fit: cover;
  display: block;
  background: #ffffff;
}

.goods-img--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c7c7cc;
}

.goods-img--placeholder svg {
  width: 26px;
  height: 26px;
}

.goods-desc {
  flex: 1;
  min-width: 0;
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-arrow {
  flex-shrink: 0;
  font-size: 20px;
  font-weight: 300;
  line-height: 1;
  color: #c7c7cc;
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
  gap: 12px;
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
  width: 80%;
}

.skeleton-text-mid {
  width: 55%;
}

.skeleton-text-short {
  width: 30%;
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
