<template>
  <div class="campus-market">
    <div class="main-container">
      <!-- 搜索框 -->
      <div class="search-box">
        <el-icon><Search /></el-icon>
        <input
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="搜索商品"
          @keyup.enter="handleSearch"
        />
        <span v-if="searchText" class="search-clear" @click="handleClear">
          <el-icon><Close /></el-icon>
        </span>
      </div>
      <!-- 空状态 -->
      <div v-if="!loading && productList.length === 0" class="empty-state">
        <div class="empty-state__icon">
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="8" y="12" width="48" height="40" rx="4" />
            <circle cx="22" cy="28" r="4" />
            <path d="M8 44l12-10 8 6 12-10 16 12" />
          </svg>
        </div>
        <p class="empty-state__title">{{ searchMode ? '未找到相关商品' : '暂无商品' }}</p>
        <p class="empty-state__desc">
          {{ searchMode ? '换个关键词试试吧' : '还没有人发布闲置，快去发布第一个吧' }}
        </p>
      </div>

      <!-- 商品列表：瀑布流 -->
      <div v-else class="waterfall-container">
        <div
          v-for="item in productList"
          :key="item.itemId"
          class="product-item"
          @click="goToItem(item.itemId)"
        >
          <img
            :src="item.image"
            alt="商品图片"
            :style="{ aspectRatio: item.imgWidth + '/' + item.imgHeight }"
          />
          <div class="product-name">{{ item.description }}</div>
          <!-- 商品描述 -->
          <div class="item-footer">
            <span class="price-nickname">
              <span class="product-price">{{ item.price }}</span
              ><!-- 商品价格 -->
              <span class="product-original-price">{{ item.originalPrice }}</span
              ><!-- 原始价格 -->
            </span>
          </div>
          <div class="seller-info">
            <span class="seller-avatar">
              <img :src="item.sellerProfilePicture" alt="卖家头像" />
              <!-- 卖家头像 -->
              <span class="seller-nickname">{{ item.sellerNickname }}</span
              ><!-- 卖家昵称 -->
            </span>
            <span class="product-credit-score">信誉分：{{ item.creditScore }}</span
            ><!-- 信用积分 -->
          </div>
        </div>
      </div>

      <!-- 底部状态 -->
      <div v-if="productList.length > 0" class="bottom-status">
        <!-- 加载动画 -->
        <div v-if="hasMore" class="loading-dots">
          <span class="dot" :style="{ animationDelay: '0s' }"></span>
          <span class="dot" :style="{ animationDelay: '0.2s' }"></span>
          <span class="dot" :style="{ animationDelay: '0.4s' }"></span>
          <p class="loading-text">正在加载</p>
        </div>
        <!-- 没有更多 -->
        <p v-else class="no-more-text">没有更多啦!</p>
      </div>
      <!-- 滚动哨兵 -->
      <div ref="sentinelRef" class="scroll-sentinel"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Close } from '@element-plus/icons-vue'
import { getItemsToPage, searchItemsByKeyword, type GoodsVO } from '@/api/item'
import { DEFAULT_AVATAR } from '@/utils/avatar'

const router = useRouter()
const goToItem = (id: string) => {
  router.push({ name: 'item', params: { id } })
}
const searchText = ref('')
const searchMode = ref(false)

interface ProductItem {
  image: string
  imgWidth: number
  imgHeight: number
  description: string
  price: string
  sellerProfilePicture: string
  sellerNickname: string
  originalPrice: string
  creditScore: string
  itemId: string
}

const productList = ref<ProductItem[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = ref(true)

function mapGoodsToProduct(goods: GoodsVO): ProductItem {
  const firstImg = goods.imgList?.[0]
  return {
    image: firstImg?.imgUrl || 'https://picsum.photos/200/300',
    imgWidth: firstImg?.imgWidth || 200,
    imgHeight: firstImg?.imgHeight || 300,
    description: goods.goodsDesc,
    price: `¥${(goods.price ?? 0).toFixed(2)}`,
    sellerProfilePicture: DEFAULT_AVATAR,
    sellerNickname: goods.userName || '匿名用户',
    originalPrice: `¥${(goods.originalPrice ?? 0).toFixed(2)}`,
    creditScore: '100',
    itemId: goods.goodsId,
  }
}

async function fetchPage(isLoadMore = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = searchMode.value
      ? await searchItemsByKeyword({
          keyword: searchText.value.trim(),
          pageNumber: page.value,
          pageSize,
        })
      : await getItemsToPage({
          pageNumber: page.value,
          pageSize,
        })
    if (res.code === 1 && res.data) {
      const { total: t, rows } = res.data
      total.value = t
      const existingIds = new Set(productList.value.map((p) => p.itemId))
      const mapped = rows.map(mapGoodsToProduct).filter((item) => !existingIds.has(item.itemId))
      if (isLoadMore) {
        productList.value.push(...mapped)
      } else {
        productList.value = mapped
      }
      hasMore.value = productList.value.length < t
    }
  } catch {
    console.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  const keyword = searchText.value.trim()
  if (!keyword) {
    // 关键词为空，恢复普通浏览模式
    handleClear()
    return
  }
  searchMode.value = true
  page.value = 1
  productList.value = []
  hasMore.value = true
  fetchPage()
}

function handleClear() {
  searchText.value = ''
  searchMode.value = false
  page.value = 1
  productList.value = []
  hasMore.value = true
  fetchPage()
}

const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let lastFetchTime = 0
const FETCH_DEBOUNCE_MS = 3000

function setupObserver() {
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !loading.value) {
        const now = Date.now()
        if (now - lastFetchTime < FETCH_DEBOUNCE_MS) return
        lastFetchTime = now
        page.value++
        fetchPage(true)
      }
    },
    { rootMargin: '100px' },
  )
  observer.observe(sentinelRef.value)
}

onMounted(() => {
  fetchPage()
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.campus-market {
  padding: 0 0 48px 0;
  background: #f5f5f7;
  min-height: 100vh;
}

.main-container {
  width: 80%;
  margin: 0 auto;
  padding-top: 48px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  width: 33.33%;
  margin: 0 auto;
  padding: 0 17px;
  background: #f0f0f0;
  border-radius: 9999px;
  will-change: width;
  transform: translateZ(0);
  transition:
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.2s ease;
}

.search-box:focus-within {
  width: 66.66%;
  background: #ffffff;
}

.search-icon {
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

.search-input::placeholder {
  color: #7a7a7a;
}

.search-clear {
  flex-shrink: 0;
  cursor: pointer;
  color: #7a7a7a;
  display: flex;
  align-items: center;
  transition: color 0.2s ease;
}

.search-clear:hover {
  color: #1d1d1f;
}

/* ===== 空状态 ===== */
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

.waterfall-container {
  column-count: 4;
  column-gap: 24px;
  padding: 32px 0;
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
}

.product-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.product-item img {
  width: 100%;
  display: block;
}

@media (max-width: 1200px) {
  .waterfall-container {
    column-count: 3;
  }
}

@media (max-width: 900px) {
  .waterfall-container {
    column-count: 2;
  }
}

@media (max-width: 600px) {
  .waterfall-container {
    column-count: 1;
  }
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

.price-nickname {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.price-nickname img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  aspect-ratio: auto;
  flex-shrink: 0;
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

.product-seller {
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-credit-score {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.12px;
  color: #0066cc;
  flex-shrink: 0;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 17px 17px;
}

.seller-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 17px 17px;
}

.seller-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.seller-avatar img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

/* ===== 底部状态 ===== */
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
</style>
