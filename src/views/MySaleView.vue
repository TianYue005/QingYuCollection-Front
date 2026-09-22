<template>
  <div class="sale-page">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-title">
        <h2 class="page-title">我卖出的</h2>
        <span v-if="!firstLoading" class="page-desc">这里展示你已完成交易的宝贝</span>
      </div>
      <span v-if="!firstLoading && total > 0" class="page-count">共 {{ total }} 件</span>
    </div>

    <!-- 分割线 -->
    <div class="header-divider"></div>

    <!-- 首次加载骨架屏 -->
    <div v-if="firstLoading" class="skeleton-list">
      <div v-for="n in 5" :key="n" class="row-skeleton">
        <div class="skeleton-img"></div>
        <div class="skeleton-lines">
          <div class="skeleton-text skeleton-text-long"></div>
          <div class="skeleton-text skeleton-text-short"></div>
          <div class="skeleton-text skeleton-text-mid"></div>
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
      <button class="retry-btn" @click="fetchList(1)">重新加载</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="soldList.length === 0" class="state-box">
      <div class="state-icon">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="8" y="12" width="48" height="40" rx="4" />
          <circle cx="22" cy="28" r="4" />
          <path d="M8 44l12-10 8 6 12-10 16 12" />
          <path d="M22 16v6M42 16v6M16 18h32" stroke-width="1.5" />
        </svg>
      </div>
      <p class="state-title">还没有卖出的商品</p>
      <p class="state-desc">当你的宝贝完成交易后，会出现在这里</p>
    </div>

    <!-- 卖出记录列表 -->
    <template v-else>
      <div class="sold-list">
        <div v-for="item in soldList" :key="String(item.goodsId)" class="sold-row">
          <!-- 商品图片 -->
          <div class="thumb">
            <img v-if="imgUrlOf(item)" class="thumb-img" :src="imgUrlOf(item)" alt="商品图片" />
            <div v-else class="thumb-placeholder">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="12" width="36" height="26" rx="3" />
                <path d="M6 20h36M17 20v-5a7 7 0 0 1 14 0v5" />
              </svg>
            </div>
          </div>

          <!-- 商品信息 -->
          <div class="row-main">
            <div class="row-desc">{{ item.goodsDesc || '暂无描述' }}</div>

            <!-- 标签 -->
            <div v-if="tagListOf(item).length" class="row-tags">
              <span v-for="tag in tagListOf(item)" :key="tag" class="tag">{{ tag }}</span>
            </div>

            <!-- 价格 -->
            <div class="row-meta">
              <div class="price-block">
                <span v-if="priceTextOf(item)" class="row-price">{{ priceTextOf(item) }}</span>
                <span v-if="originalTextOf(item)" class="row-original">{{ originalTextOf(item) }}</span>
              </div>
            </div>
          </div>

          <!-- 状态 -->
          <div class="row-side">
            <span class="sold-badge">已售出</span>
            <!-- 无评价时展示“评论买家”按钮，已评价（hasEvaluate=1）则不显示 -->
            <button v-if="!hasEvaluated(item)" class="evaluate-btn" @click="openEvaluate(item)">
              评论买家
            </button>
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

    <!-- 评价买家弹窗 -->
    <el-dialog
      v-model="evaluateVisible"
      title="评论买家"
      width="420px"
      :close-on-click-modal="false"
      @closed="resetEvaluateForm"
    >
      <div class="evaluate-form">
        <div class="evaluate-form__item">
          <span class="evaluate-form__label">评价分数</span>
          <el-rate v-model="evaluateScore" :max="5" />
        </div>
        <div class="evaluate-form__item">
          <span class="evaluate-form__label">评价内容</span>
          <el-input
            v-model="evaluateContent"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="说说这次的交易体验..."
          />
        </div>
      </div>
      <template #footer>
        <el-button :disabled="evaluateSubmitting" @click="evaluateVisible = false">取消</el-button>
        <el-button type="primary" :loading="evaluateSubmitting" @click="submitEvaluate">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from '@/utils/message'
import { addEvaluateBuyer, getMySoldItems, type SoldGoodsVO } from '@/api/item'

/* ---- 列表数据 ---- */
const firstLoading = ref(true)
const loading = ref(false)
const error = ref('')
const soldList = ref<SoldGoodsVO[]>([])
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

/* ---- 展示字段辅助函数 ---- */

/** 商品首图（后端以 imgUrl/imgWidth/imgHeight 平铺字段下发） */
function imgUrlOf(item: SoldGoodsVO): string {
  return item.imgUrl || ''
}

function tagListOf(item: SoldGoodsVO): string[] {
  if (!item.tags) return []
  return item.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/** 价格格式化（BigDecimal 可能以字符串下发），缺失时返回空串隐藏价格 */
function fmtPrice(v?: number | string): string {
  if (v === undefined || v === null || v === '') return ''
  const n = Number(v)
  if (Number.isNaN(n)) return ''
  return `¥${n.toFixed(2)}`
}

const priceTextOf = (item: SoldGoodsVO) => fmtPrice(item.price)
const originalTextOf = (item: SoldGoodsVO) => fmtPrice(item.originalPrice)

/** 该笔交易是否已评价（hasEvaluate=1 为有评价；0/缺失视为未评价，需要展示“评论买家”） */
function hasEvaluated(item: SoldGoodsVO): boolean {
  return Number(item.hasEvaluate) === 1
}

/**
 * 兼容后端两种返回结构：
 * - 直接返回 PageResult：{ total, rows: [...] }
 * - 被 Result 包装：{ code, msg, data: { total, rows: [...] } }
 * 解析成功返回分页数据，结构不对返回 null
 */
function resolvePage(res: unknown): { total: number; rows: SoldGoodsVO[] } | null {
  const r = res as { code?: number; data?: unknown; total?: number; rows?: unknown }
  // 直接返回 PageResult
  if (r && Array.isArray(r.rows)) {
    return { total: Number(r.total ?? (r.rows as unknown[]).length), rows: r.rows as SoldGoodsVO[] }
  }
  // Result 包装
  const data = r?.data as { total?: number; rows?: unknown } | undefined
  if (data && Array.isArray(data.rows)) {
    return { total: Number(data.total ?? (data.rows as unknown[]).length), rows: data.rows as SoldGoodsVO[] }
  }
  return null
}

/* ---- 列表查询 ---- */
async function fetchList(targetPage: number) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await getMySoldItems({
      pageNumber: targetPage,
      pageSize,
    })
    const pageData = resolvePage(res)
    if (pageData) {
      page.value = targetPage
      total.value = pageData.total
      soldList.value = pageData.rows || []
      // 调试：打印解析到的商品与图片链接
      console.log('已卖出商品：', soldList.value)
      soldList.value.forEach((row) => console.log('图片链接：', imgUrlOf(row)))
    } else {
      error.value = (res as { msg?: string })?.msg || '加载失败，请稍后重试'
      soldList.value = []
    }
  } catch (e: any) {
    error.value = e?.message || '网络异常，请稍后重试'
    soldList.value = []
  } finally {
    loading.value = false
    firstLoading.value = false
  }
}

function changePage(targetPage: number) {
  if (loading.value || targetPage < 1 || targetPage > pageCount.value) return
  fetchList(targetPage)
}

/* ---- 评价买家 ---- */
const evaluateVisible = ref(false)
const evaluateSubmitting = ref(false)
const evaluateScore = ref(5)
const evaluateContent = ref('')
const evaluateTarget = ref<SoldGoodsVO | null>(null)

function openEvaluate(item: SoldGoodsVO) {
  evaluateTarget.value = item
  evaluateScore.value = 5
  evaluateContent.value = ''
  evaluateVisible.value = true
}

function resetEvaluateForm() {
  evaluateTarget.value = null
  evaluateScore.value = 5
  evaluateContent.value = ''
}

async function submitEvaluate() {
  const item = evaluateTarget.value
  if (!item) return
  const content = evaluateContent.value.trim()
  if (!content) {
    toast.warning('请输入评价内容')
    return
  }
  if (evaluateScore.value < 1 || evaluateScore.value > 5) {
    toast.warning('请选择 1-5 分的评价分数')
    return
  }
  evaluateSubmitting.value = true
  try {
    const res = await addEvaluateBuyer({
      goodsId: item.goodsId,
      content,
      score: evaluateScore.value,
    })
    if (res.code === 1) {
      toast.success('评价成功')
      // 接口成功后本地标记为已评价，隐藏按钮（列表下次刷新时以后端 has_evaluate 为准）
      item.hasEvaluate = 1
      evaluateVisible.value = false
    } else {
      toast.error(res.msg || '评价失败，仅交易双方可评价')
    }
  } catch {
    toast.error('评价失败，请稍后重试')
  } finally {
    evaluateSubmitting.value = false
  }
}

onMounted(() => {
  fetchList(1)
})
</script>

<style scoped>
.sale-page {
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

/* ===== 卖出记录列表 ===== */
.sold-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sold-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.sold-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

/* 图片 */
.thumb {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #f0f0f3;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c7c7cc;
  background: linear-gradient(135deg, #f5f5f7 0%, #ebebf0 100%);
}

.thumb-placeholder svg {
  width: 34px;
  height: 34px;
}

/* 信息主体 */
.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-desc {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: #1d1d1f;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 2px 8px;
  border-radius: 9999px;
  background: #f0f0f0;
  font-size: 12px;
  color: #7a7a7a;
}

.row-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.price-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-price {
  font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #e53935;
}

.row-original {
  font-size: 12px;
  color: #7a7a7a;
  text-decoration: line-through;
}

/* 右侧状态 */
.row-side {
  flex-shrink: 0;
  padding-left: 4px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.sold-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  background: #e8f8ee;
  color: #1d8a3e;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

/* 评论买家按钮（仅未评价时展示） */
.evaluate-btn {
  display: inline-block;
  padding: 5px 14px;
  border: 1px solid #0066cc;
  border-radius: 9999px;
  background: #ffffff;
  color: #0066cc;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.evaluate-btn:hover {
  background: #e8f2ff;
}

/* ===== 评价买家弹窗 ===== */
.evaluate-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.evaluate-form__item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evaluate-form__label {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
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
  padding: 14px 18px;
  background: #ffffff;
  border-radius: 14px;
}

.skeleton-img {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  border-radius: 12px;
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

.skeleton-text-mid {
  width: 40%;
}

.skeleton-text-short {
  width: 25%;
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
