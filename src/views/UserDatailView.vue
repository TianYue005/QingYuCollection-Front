<template>
  <div class="user-detail">
    <!-- 用户信息区 -->
    <section class="profile-card">
      <img class="profile-avatar" :src="resolveAvatar(userInfo?.avatar)" alt="用户头像" />

      <div class="profile-base">
        <div class="base-field">
          <span class="base-value base-value--name">{{ userInfo?.userName || '用户名' }}</span>
        </div>
        <div class="base-field">
          <span class="base-value base-value--id">{{ userInfo?.userId || '用户ID' }}</span>
        </div>
      </div>

      <div class="profile-stats">
        <div class="stat-card">
          <span class="stat-label">账号等级</span>
          <span class="stat-value">{{ userInfo?.level ?? '—' }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">信誉积分</span>
          <span class="stat-value">{{ userInfo?.credit ?? '—' }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">账号状态</span>
          <span class="stat-value" :class="statusClass">{{ statusText }}</span>
        </div>
      </div>
    </section>

    <!-- 评价切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.label"
        class="tab-chip"
        :class="{ 'tab-chip--selected': activeTab === tab.target }"
        :aria-pressed="activeTab === tab.target"
        @click="switchTab(tab.target)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 评价列表区 -->
    <section class="content-panel">
      <!-- 首次加载骨架屏 -->
      <div v-if="firstLoading" class="panel-body panel-body--list">
        <div v-for="n in 3" :key="n" class="row-skeleton">
          <div class="skeleton-text skeleton-text-short"></div>
          <div class="skeleton-text skeleton-text-long"></div>
          <div class="skeleton-text skeleton-text-mid"></div>
        </div>
      </div>

      <!-- 加载失败 -->
      <div v-else-if="listError" class="panel-body state-box">
        <div class="state-icon">
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="32" cy="32" r="28" />
            <path d="M22 22L42 42M42 22L22 42" stroke-width="2" />
          </svg>
        </div>
        <p class="state-title">加载失败</p>
        <p class="state-desc">{{ listError }}</p>
        <button class="retry-btn" @click="fetchList(1)">重新加载</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="list.length === 0" class="panel-body state-box">
        <div class="state-icon">
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
            <path
              d="M32 8l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L32 41.2 19 48l2.5-14.5L11 23.3l14.5-2.1L32 8z"
            />
          </svg>
        </div>
        <p class="state-title">{{ emptyTitle }}</p>
        <p class="state-desc">{{ emptyDesc }}</p>
      </div>

      <!-- 评价列表 -->
      <div v-else class="panel-body panel-body--list">
        <div v-for="item in list" :key="String(item.id)" class="review-card">
          <div class="review-head">
            <img
              class="review-avatar"
              :src="resolveAvatar(oppositeAvatar(item))"
              alt="头像"
              @click="goUserDetail(oppositeId(item))"
            />
            <div class="review-user">
              <div class="review-name-row">
                <span class="review-name">{{ oppositeName(item) || '匿名用户' }}</span>
                <span class="review-role">{{ oppositeRole }}</span>
                <span
                  class="trait-tag"
                  :class="isGood(item) ? 'trait-tag--good' : 'trait-tag--bad'"
                >
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

      <!-- 分页条 -->
      <div v-if="!firstLoading && !listError && list.length > 0" class="pagination">
        <button class="page-btn" :disabled="page <= 1 || loading" @click="changePage(page - 1)">
          上一页
        </button>
        <template v-for="p in pageItems" :key="String(p)">
          <span v-if="p === '...'" class="page-ellipsis">…</span>
          <button
            v-else
            class="page-btn"
            :class="{ 'page-btn--current': p === page }"
            :aria-current="p === page ? 'page' : undefined"
            :disabled="loading"
            @click="changePage(p)"
          >
            {{ p }}
          </button>
        </template>
        <button
          class="page-btn"
          :disabled="page >= pageCount || loading"
          @click="changePage(page + 1)"
        >
          下一页
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getThisUserDetail,
  getUserReviewList,
  type EvaluateVO,
  type UserDetail,
} from '@/api/user'
import { resolveAvatar } from '@/utils/avatar'
import { toast } from '@/utils/message'

const route = useRoute()
const router = useRouter()

/**
 * 被查看用户 id：由上一个页面跳转时通过路由传递，本页不提供任何用户 id 输入入口。
 *
 * 后续需要从别的页面进入本页时，在跳转处把目标用户 id 带上即可（三种等价写法）：
 *   // 1) 命名路由 + params（推荐，对应路由 path: '/UserDatail/:userId?'）
 *   router.push({ name: 'UserDatail', params: { userId } })
 *   // 2) 命名路由 + query（效果相同，可读性更好）
 *   router.push({ name: 'UserDatail', query: { userId } })
 *   // 3) 模板里直接拼路径
 *   <RouterLink :to="`/UserDatail/${sellerId}`">查看该用户</RouterLink>
 *
 * 用户 id 的常见来源：
 *   - 商品详情页 ItemView 的卖家 sellerDetail.sellerId
 *   - 评价列表 / 交易记录里的对端 id（EvaluateVO.evaluatorId / evaluatedId、SoldGoodsVO.sold）
 *   - 聊天会话里的对方 id（ChatListVO.userId）
 * 上面这些 id 在运行期都可能是字符串，统一 String() 后再用，避免雪花 id 精度丢失。
 *
 * 另外：如果将来支持"从本页再点进另一个用户详情"（同路由不同参数），
 * Vue Router 会复用组件实例，需要在下面补一个 watch(userId) 重新拉取用户信息与评价。
 */
const userId = computed(() => {
  const raw = route.params.userId ?? route.query.userId
  return raw ? String(raw) : ''
})

/**
 * 评价切换（对应后端 ItemQueryParam.target）：
 * - 1：别人对该用户的评价（评价人对 ta 的评价）
 * - 0：该用户对别人的评价
 */
const tabs = [
  { label: '别人的评价', target: 1 },
  { label: '评价别人', target: 0 },
]
const activeTab = ref(1)

/** 用户信息 */
const userInfo = ref<UserDetail | null>(null)

/** 账号状态：后端 1 正常，2 冻结 */
const statusText = computed(() => {
  switch (userInfo.value?.status) {
    case 1:
      return '正常'
    case 2:
      return '冻结'
    default:
      return '—'
  }
})

const statusClass = computed(() => {
  if (userInfo.value?.status === 1) return 'stat-value--active'
  if (userInfo.value?.status === 2) return 'stat-value--frozen'
  return ''
})

/** 评价列表 */
const firstLoading = ref(true)
const loading = ref(false)
const listError = ref('')
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

const emptyTitle = computed(() =>
  activeTab.value === 1 ? '该用户还没有收到评价' : '该用户还没有发出评价',
)
const emptyDesc = computed(() =>
  activeTab.value === 1 ? '交易完成后对方的评价会展示在这里' : '交易完成后该用户的评价会展示在这里',
)

/** 列表展示的是"对方"：别人评价 ta 时对方是评价人，ta 评价别人时对方是被评价人 */
const oppositeRole = computed(() => (activeTab.value === 1 ? '评价人' : '被评价人'))

function oppositeName(item: EvaluateVO): string {
  return activeTab.value === 1 ? item.evaluatorName : item.evaluatedName
}

function oppositeAvatar(item: EvaluateVO): string {
  return activeTab.value === 1 ? item.evaluatorAvatar : item.evaluatedAvatar
}

/** 评价对象（对方）的用户 id：别人的评价看评价人，该用户发出的评价看被评价人 */
function oppositeId(item: EvaluateVO): number | string {
  return activeTab.value === 1 ? item.evaluatorId : item.evaluatedId
}

/** 后端 trait 口径：score>=4 为好评，<=3 为差评 */
const isGood = (item: EvaluateVO) => (Number(item.score) || 0) >= 4

const goItem = (goodsId: number | string) => {
  if (!goodsId) return
  router.push({ name: 'item', params: { id: String(goodsId) } })
}

/** 点击评价里的用户头像：跳转到该用户的详情页 */
const goUserDetail = (targetUserId: number | string) => {
  if (targetUserId == null || targetUserId === '') return
  router.push({ name: 'UserDatail', params: { userId: String(targetUserId) } })
}

/** 用户详情：/user/thisUserDetail/{userId} */
async function fetchUserDetail() {
  if (!userId.value) {
    toast.error('缺少用户 id，无法加载用户信息')
    return
  }
  try {
    const res = await getThisUserDetail(userId.value)
    userInfo.value = res?.data ?? null
  } catch (e: any) {
    toast.error(e?.message || '用户信息加载失败')
  }
}

/**
 * 兼容后端两种返回结构：
 * - 直接返回 PageResult：{ total, rows }
 * - Result 包装：{ code, msg, data: { total, rows } }
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

/** 评价列表：/user/myReview（userId + target + 分页） */
async function fetchList(targetPage = page.value) {
  if (loading.value) return
  if (!userId.value) {
    firstLoading.value = false
    listError.value = '缺少用户 id，无法加载评价'
    return
  }
  loading.value = true
  listError.value = ''
  try {
    const res = await getUserReviewList({
      userId: userId.value,
      target: activeTab.value,
      pageNumber: targetPage,
      pageSize,
    })
    const pageData = resolvePage(res)
    if (pageData) {
      page.value = targetPage
      total.value = pageData.total
      list.value = pageData.rows
    } else {
      listError.value = (res as { msg?: string })?.msg || '加载失败，请稍后重试'
      list.value = []
    }
  } catch (e: any) {
    listError.value = e?.message || '网络异常，请稍后重试'
    list.value = []
  } finally {
    loading.value = false
    firstLoading.value = false
  }
}

function switchTab(target: number) {
  if (activeTab.value === target || loading.value) return
  activeTab.value = target
  firstLoading.value = true
  fetchList(1)
}

function changePage(targetPage: number) {
  if (loading.value || targetPage < 1 || targetPage > pageCount.value) return
  fetchList(targetPage)
}

onMounted(() => {
  fetchUserDetail()
  fetchList(1)
})

/**
 * 从本页点进另一个用户详情时（同路由不同 userId），Vue Router 会复用组件实例，
 * 需手动重置状态并重新拉取用户信息与评价列表。
 */
watch(userId, (id) => {
  if (!id) return
  userInfo.value = null
  activeTab.value = 1
  firstLoading.value = true
  fetchUserDetail()
  fetchList(1)
})
</script>

<style scoped>
/* ============================================================
   与站内其他页面（Profile.vue / FavoriteView.vue / CreditAndReviewsView.vue）保持同一套视觉：
   - SF Pro Text / SF Pro Display 字体栈
   - 白色圆角卡片（18px）+ 极轻投影，页面底色为全局的 parchment
   - 状态用 success / warning 语义色
   - 筛选胶囊选中态为 #0071e3 实底白字
   - 分页为 36px 描边胶囊，当前页实底蓝
   ============================================================ */

.user-detail {
  --font-stack: 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-stack-display: 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 0 48px;
  font-family: var(--font-stack);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== 用户信息区 ===== */
.profile-card {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 32px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.profile-avatar {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  background: #f5f5f7;
}

/* 用户名 / 用户ID：parchment 浅底块，无描边 */
.profile-base {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.base-field {
  min-width: 190px;
  height: 46px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-radius: 12px;
  background: #ffffff;
}

.base-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 17px;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

.base-value--name {
  font-weight: 600;
}

.base-value--id {
  font-weight: 400;
  color: #7a7a7a;
}

/* 账号等级 / 信誉积分 / 账号状态 */
.profile-stats {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.stat-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 12px;
  border-radius: 14px;
  background: #ffffff;
}

.stat-label {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: #7a7a7a;
  text-align: center;
  white-space: nowrap;
}

.stat-value {
  font-family: var(--font-stack-display);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.216px;
  color: #1d1d1f;
}

.stat-value--active {
  color: #34c759;
}

.stat-value--frozen {
  color: #ff3b30;
}

/* ===== 评价切换（沿用 CreditAndReviewsView 的 filter-chip） ===== */
.tab-bar {
  display: flex;
  gap: 8px;
}

.tab-chip {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 9999px;
  background: #ffffff;
  color: #1d1d1f;
  font-family: var(--font-stack);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.tab-chip:hover {
  border-color: #0066cc;
  color: #0066cc;
}

.tab-chip--selected {
  border-color: #0071e3;
  background: #0071e3;
  color: #ffffff;
  font-weight: 600;
}

.tab-chip--selected:hover {
  color: #ffffff;
}

.tab-chip:active {
  transform: scale(0.95);
}

/* ===== 评价内容区 ===== */
.content-panel {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.panel-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 48px 24px;
}

.panel-body--list {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 12px;
  padding: 24px;
}

/* ===== 评价卡片 ===== */
.review-card {
  padding: 18px 20px;
  border-radius: 14px;
  background: #f5f5f7;
  transition: background 0.15s ease;
}

.review-card:hover {
  background: #efeff3;
}

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
  background: #ffffff;
  cursor: pointer;
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

.review-content {
  margin: 14px 0 0;
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
  background: #ffffff;
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
  background: #f5f5f7;
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
.row-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 14px;
  background: #f5f5f7;
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
  flex-direction: column;
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
  font-family: var(--font-stack-display);
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
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

/* ===== 分页条（沿用 CreditAndReviewsView 的分页样式） ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d2d2d7;
  border-radius: 9999px;
  background: #ffffff;
  color: #1d1d1f;
  font-family: var(--font-stack);
  font-size: 14px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.page-btn:hover:not(:disabled):not(.page-btn--current) {
  border-color: #0071e3;
  color: #0071e3;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn--current {
  border-color: #0071e3;
  background: #0071e3;
  color: #ffffff;
}

.page-ellipsis {
  padding: 0 2px;
  color: #86868b;
  user-select: none;
}

/* ===== 响应式 ===== */
@media (max-width: 834px) {
  .profile-card {
    flex-direction: column;
    align-items: stretch;
    gap: 24px;
    padding: 24px;
  }

  .profile-avatar {
    align-self: center;
  }

  .base-field {
    min-width: 0;
  }

  .profile-stats {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .user-detail {
    padding: 20px 12px 60px;
  }

  .panel-body {
    min-height: 240px;
    padding: 32px 20px;
  }

  .panel-body--list {
    padding: 16px;
  }

  .review-head {
    flex-wrap: wrap;
  }
}
</style>
