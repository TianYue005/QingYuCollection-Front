<template>
  <div class="favorite-page">
    <!-- 头部 -->
    <div class="page-header">
      <h2 class="page-title">我的收藏</h2>
      <span v-if="!firstLoading && total > 0" class="page-count">{{ total }} 件商品</span>
    </div>

    <!-- 分割线 -->
    <div class="header-divider"></div>

    <!-- 首次加载骨架屏 -->
    <div v-if="firstLoading" class="loading-state">
      <div class="loading-skeleton" v-for="n in 8" :key="n">
        <div class="skeleton-img"></div>
        <div class="skeleton-text skeleton-text-short"></div>
        <div class="skeleton-text skeleton-text-long"></div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="empty-state">
      <div class="empty-state__icon">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="32" cy="32" r="28" />
          <path d="M22 22L42 42M42 22L22 42" stroke-width="2" />
        </svg>
      </div>
      <p class="empty-state__title">加载失败</p>
      <p class="empty-state__desc">{{ error }}</p>
      <button class="retry-btn" @click="fetchFavorites()">重新加载</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="favoriteList.length === 0" class="empty-state">
      <div class="empty-state__icon">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M32 56L12.46 44.74C9.67 43.08 8 40.04 8 36.76V27.24C8 23.96 9.67 20.92 12.46 19.26L32 8L51.54 19.26C54.33 20.92 56 23.96 56 27.24V36.76C56 40.04 54.33 43.08 51.54 44.74L32 56Z" />
          <path d="M22 32L29 39L42 26" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <p class="empty-state__title">还没有收藏</p>
      <p class="empty-state__desc">去校园市场逛逛，把喜欢的商品收藏起来吧</p>
    </div>

    <!-- 收藏列表：瀑布流 -->
    <template v-else>
      <div class="waterfall-container">
        <div
          v-for="item in favoriteList"
          :key="item.itemId"
          class="product-item"
          @click="goToItem(item.itemId)"
        >
          <!-- 取消收藏按钮 -->
          <button class="unfavorite-btn" @click.stop="handleUnfavorite(item.itemId)" title="取消收藏">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.33l2.06 4.17 4.6.67-3.33 3.25.79 4.58L8 11.98l-4.12 2.02.79-4.58L1.34 6.17l4.6-.67L8 1.33z" />
            </svg>
          </button>

          <img
            v-if="item.image"
            :src="item.image"
            alt="商品图片"
            :style="imgStyleOf(item)"
          />
          <div v-else class="img-placeholder" :style="imgStyleOf(item)">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="12" width="36" height="26" rx="3" />
              <path d="M6 20h36M17 20v-5a7 7 0 0 1 14 0v5" />
            </svg>
          </div>
          <div class="product-name">{{ item.description }}</div>
          <div class="item-footer">
            <span class="price-nickname">
              <span v-if="item.price" class="product-price">{{ item.price }}</span>
              <span v-if="item.originalPrice" class="product-original-price">{{ item.originalPrice }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 底部状态 -->
      <div class="bottom-status">
        <div v-if="hasMore" class="loading-dots">
          <span class="dot" :style="{ animationDelay: '0s' }"></span>
          <span class="dot" :style="{ animationDelay: '0.2s' }"></span>
          <span class="dot" :style="{ animationDelay: '0.4s' }"></span>
          <p class="loading-text">正在加载</p>
        </div>
        <p v-else class="no-more-text">没有更多啦!</p>
      </div>

      <!-- 滚动哨兵 -->
      <div ref="sentinelRef" class="scroll-sentinel"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getFavoriteList, removeFavorite, type FavoriteItemVO } from '@/api/user'
import { toast } from '@/utils/message'

const router = useRouter()

interface FavoriteItem {
  image: string
  imgWidth: number
  imgHeight: number
  description: string
  price: string
  originalPrice: string
  itemId: string
}

const favoriteList = ref<FavoriteItem[]>([])
const firstLoading = ref(true)
const error = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = ref(true)

const goToItem = (id: string) => {
  router.push({ name: 'item', params: { id } })
}

const handleUnfavorite = async (id: string) => {
  try {
    const res = await removeFavorite(id)
    if (res.code === 1) {
      favoriteList.value = favoriteList.value.filter((item) => item.itemId !== id)
      total.value = Math.max(0, total.value - 1)
      toast.success('已取消收藏')
    }
  } catch {
    toast.error('操作失败，请重试')
  }
}

const fetchFavorites = async (isLoadMore = false) => {
  if (!isLoadMore) {
    firstLoading.value = true
    error.value = ''
  }
  try {
    const res = await getFavoriteList({
      pageNumber: page.value,
      pageSize,
    })
    if (res.code === 1 && res.data) {
      const { total: t, rows } = res.data
      total.value = t
      const existingIds = new Set(favoriteList.value.map((p) => p.itemId))
      const mapped = rows.map(mapGoodsToFavorite).filter((item) => !existingIds.has(item.itemId))
      if (isLoadMore) {
        favoriteList.value.push(...mapped)
      } else {
        favoriteList.value = mapped
      }
      hasMore.value = favoriteList.value.length < t
    }
  } catch (e: any) {
    if (!isLoadMore) {
      error.value = e?.message || '网络异常，请稍后重试'
    }
  } finally {
    firstLoading.value = false
  }
}

/** 商品图等比占位：后端以 imgUrl/imgWidth/imgHeight 平铺字段下发首图 */
function imgStyleOf(item: FavoriteItem): Record<string, string> {
  if (item.imgWidth > 0 && item.imgHeight > 0) {
    return { aspectRatio: `${item.imgWidth} / ${item.imgHeight}` }
  }
  return {}
}

/** 价格格式化（BigDecimal 可能以字符串下发，缺失时返回空串隐藏价格） */
function fmtPrice(v?: number | string): string {
  if (v === undefined || v === null || v === '') return ''
  const n = Number(v)
  if (Number.isNaN(n)) return ''
  return `¥${n.toFixed(2)}`
}

function mapGoodsToFavorite(item: FavoriteItemVO): FavoriteItem {
  return {
    image: item.imgUrl || '',
    imgWidth: item.imgWidth || 0,
    imgHeight: item.imgHeight || 0,
    description: item.goodsDesc || '',
    price: fmtPrice(item.price),
    originalPrice: fmtPrice(item.originalPrice),
    itemId: String(item.goodsId || ''),
  }
}

/* ---- 滚动加载 ---- */
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let lastFetchTime = 0
const FETCH_DEBOUNCE_MS = 3000

function setupObserver() {
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !firstLoading.value) {
        const now = Date.now()
        if (now - lastFetchTime < FETCH_DEBOUNCE_MS) return
        lastFetchTime = now
        page.value++
        fetchFavorites(true)
      }
    },
    { rootMargin: '100px' },
  )
  observer.observe(sentinelRef.value)
}

onMounted(() => {
  fetchFavorites()
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.favorite-page {
  max-width: 960px;
}

/* ---- 头部 ---- */
.page-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 0;
}

.page-title {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.17;
  letter-spacing: 0.216px;
  color: #1d1d1f;
  margin: 0;
}

.page-count {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #86868b;
}

.header-divider {
  height: 1px;
  background: #d2d2d7;
  margin: 12px 0 24px;
}

/* ---- 瀑布流 ---- */
.waterfall-container {
  column-count: 4;
  column-gap: 24px;
}

.product-item {
  break-inside: avoid;
  margin-bottom: 24px;
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  position: relative;
}

.product-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.product-item img {
  width: 100%;
  display: block;
}

.img-placeholder {
  width: 100%;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f7;
  color: #c7c7cc;
}

.img-placeholder svg {
  width: 48px;
  height: 48px;
}

.product-name {
  padding: 17px 17px 0;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #1d1d1f;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 17px 17px;
}

.price-nickname {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.product-price {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: #e53935;
  flex-shrink: 0;
}

.product-original-price {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.12px;
  color: #7a7a7a;
  text-decoration: line-through;
  flex-shrink: 0;
}

/* ---- 取消收藏按钮 ---- */
.unfavorite-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #f5a623;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    background 0.15s ease;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.product-item:hover .unfavorite-btn {
  opacity: 1;
  transform: translateY(0);
}

.unfavorite-btn:hover {
  background: rgba(255, 255, 255, 1);
  color: #e53935;
}

/* ---- 空状态 / 错误状态 ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  text-align: center;
}

.empty-state__icon {
  width: 80px;
  height: 80px;
  color: #c0c0c0;
  margin-bottom: 24px;
}

.empty-state__icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.empty-state__title {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: #1d1d1f;
  margin: 0 0 8px;
}

.empty-state__desc {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #7a7a7a;
  margin: 0;
}

.retry-btn {
  margin-top: 20px;
  padding: 8px 24px;
  border-radius: 9999px;
  border: none;
  background: #0066cc;
  color: #ffffff;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.retry-btn:hover {
  background: #0071e3;
}

/* ---- 底部状态 ---- */
.bottom-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
}

.loading-dots {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #0066cc;
  animation: dotPulse 1.2s ease-in-out infinite;
}

.loading-text {
  width: 100%;
  text-align: center;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #7a7a7a;
  margin: 8px 0 0 0;
}

@keyframes dotPulse {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.no-more-text {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #7a7a7a;
  margin: 0;
}

.scroll-sentinel {
  height: 1px;
  width: 100%;
}

/* ---- 加载骨架屏 ---- */
.loading-state {
  column-count: 4;
  column-gap: 24px;
}

.loading-skeleton {
  break-inside: avoid;
  margin-bottom: 24px;
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
}

.skeleton-img {
  width: 100%;
  height: 180px;
  background: linear-gradient(90deg, #e8e8ed 25%, #f0f0f5 50%, #e8e8ed 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  height: 14px;
  margin: 12px 17px;
  background: linear-gradient(90deg, #e8e8ed 25%, #f0f0f5 50%, #e8e8ed 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-text-short {
  width: 60%;
}

.skeleton-text-long {
  width: 80%;
  margin-bottom: 17px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ---- 响应式 ---- */
@media (max-width: 1200px) {
  .waterfall-container,
  .loading-state {
    column-count: 3;
  }
}

@media (max-width: 900px) {
  .waterfall-container,
  .loading-state {
    column-count: 2;
  }
}

@media (max-width: 600px) {
  .waterfall-container,
  .loading-state {
    column-count: 1;
  }
}
</style>
