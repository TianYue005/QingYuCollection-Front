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

      <!-- 手风琴轮播图 -->
      <div
        class="accordion-carousel"
        @mouseenter="stopBannerTimer"
        @mouseleave="startBannerTimer"
      >
        <div
          v-for="(banner, index) in accordionItems"
          :key="banner.goodsId || index"
          class="accordion-item"
          :class="{ 'is-active': activeBanner === index }"
          @click="handleAccordionClick(index)"
        >
          <img v-if="banner.image" :src="banner.image" :alt="banner.title" />
          <div v-if="banner.image" class="accordion-mask"></div>
          <div class="accordion-label" :class="{ 'is-placeholder': !banner.image }">
            <span class="accordion-title">{{ banner.title }}</span>
            <span class="accordion-subtitle">{{ banner.subtitle }}</span>
          </div>
        </div>
      </div>

      <!-- 分类标签 -->
      <div class="category-tabs">
        <div class="category-tabs__inner">
          <button
            v-for="(tab, index) in categories"
            :key="tab"
            :ref="(el) => setTabRef(el, index)"
            class="category-tab"
            :class="{ 'is-active': activeCategory === index }"
            @click="handleCategoryClick(index)"
          >
            {{ tab }}
          </button>
          <span
            class="category-tabs__indicator"
            :class="{ 'is-ready': indicatorReady }"
            :style="indicatorStyle"
          ></span>
        </div>
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
              <img
                :src="item.sellerProfilePicture"
                alt="卖家头像"
                @click.stop="goUserDetail(item.sellerId)"
              />
              <!-- 卖家头像 -->
              <span class="seller-nickname">{{ item.sellerNickname }}</span
              ><!-- 卖家昵称 -->
            </span>
            <span class="product-credit-score" :class="creditScoreClass(item.creditScore)"
              >信誉分：{{ item.creditScore ?? '--' }}</span
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
import { ref, nextTick, onMounted, onUnmounted, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Close } from '@element-plus/icons-vue'
import { getItemsToPage, searchItemsByKeyword, getRecommendItems, type GoodsVO } from '@/api/item'
import { DEFAULT_AVATAR } from '@/utils/avatar'

const router = useRouter()
const goToItem = (id: string) => {
  router.push({ name: 'item', params: { id } })
}
/** 点击卖家头像：跳转到该卖家的详情页 */
const goUserDetail = (userId: number | string) => {
  if (userId == null || userId === '') return
  router.push({ name: 'UserDatail', params: { userId: String(userId) } })
}
const searchText = ref('')
const searchMode = ref(false)

/** 手风琴导航数据（无推荐数据时显示灰色占位面板） */
interface AccordionItem {
  /** 商品首图，为空时面板显示灰色背景 */
  image: string
  title: string
  subtitle: string
  /** 推荐商品 id，存在时点击面板跳转商品详情 */
  goodsId?: string
}

/** 无数据时的占位面板（至少展示一个） */
const PLACEHOLDER_TEXT = '------'
function createPlaceholderItem(): AccordionItem {
  return {
    image: '',
    title: PLACEHOLDER_TEXT,
    subtitle: PLACEHOLDER_TEXT,
  }
}

const accordionItems = ref<AccordionItem[]>([createPlaceholderItem()])
const activeBanner = ref(0)
let bannerTimer: number | null = null
const BANNER_INTERVAL = 4000

/** 点击手风琴面板：先展开，推荐商品则跳转详情 */
function handleAccordionClick(index: number) {
  activeBanner.value = index
  const item = accordionItems.value[index]
  if (item?.goodsId) goToItem(item.goodsId)
}

/** 将推荐商品转为手风琴面板 */
function mapGoodsToAccordion(goods: GoodsVO): AccordionItem {
  const firstImg = goods.imgList?.[0]
  const firstTag = goods.tags?.split(',')[0]?.trim()
  const desc = goods.goodsDesc?.trim() || ''
  const shortDesc = desc.length > 8 ? `${desc.slice(0, 8)}…` : desc
  const price = goods.price == null ? '' : `¥${Number(goods.price).toFixed(2)}`
  const originalPrice =
    goods.originalPrice == null ? '' : `原价 ¥${Number(goods.originalPrice).toFixed(2)}`
  return {
    image: firstImg?.imgUrl || goods.imgUrl || '',
    title: firstTag || shortDesc || PLACEHOLDER_TEXT,
    subtitle: price ? [price, originalPrice].filter(Boolean).join(' · ') : PLACEHOLDER_TEXT,
    goodsId: goods.goodsId,
  }
}

/** 获取商品推荐，失败或无数据时保留灰色占位面板 */
async function loadRecommend() {
  try {
    const res = await getRecommendItems()
    if (res.code !== 1 || !res.data?.length) return
    const items = res.data.filter((goods) => goods?.goodsId).map(mapGoodsToAccordion)
    if (items.length === 0) return
    accordionItems.value = items.slice(0, 5)
    activeBanner.value = 0
  } catch {
    console.error('获取商品推荐失败')
  }
}

function startBannerTimer() {
  stopBannerTimer()
  bannerTimer = window.setInterval(() => {
    activeBanner.value = (activeBanner.value + 1) % accordionItems.value.length
  }, BANNER_INTERVAL)
}

function stopBannerTimer() {
  if (bannerTimer !== null) {
    clearInterval(bannerTimer)
    bannerTimer = null
  }
}

/** 分类标签（暂未接入筛选逻辑） */
const categories = ['全部', '电子产品', '饰品', '家居']
const activeCategory = ref(0)
const tabRefs: HTMLElement[] = []
const indicatorStyle = ref({ width: '0px', transform: 'translateX(0px)' })
const indicatorReady = ref(false)

function setTabRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el instanceof HTMLElement) tabRefs[index] = el
}

/** 根据当前选中的标签更新下方蓝色条纹的位置和宽度 */
function updateIndicator() {
  const el = tabRefs[activeCategory.value]
  if (!el) return
  indicatorStyle.value = {
    width: `${el.offsetWidth}px`,
    transform: `translateX(${el.offsetLeft}px)`,
  }
}

function handleCategoryClick(index: number) {
  if (index === activeCategory.value) return
  activeCategory.value = index
  // 等待字体粗细等样式更新后再测量，保证条纹落在正确位置
  nextTick(updateIndicator)
}

function handleResize() {
  updateIndicator()
}

interface ProductItem {
  image: string
  imgWidth: number
  imgHeight: number
  description: string
  price: string
  sellerProfilePicture: string
  sellerNickname: string
  sellerId: number | string
  originalPrice: string
  creditScore: number | null
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
    sellerId: goods.userId ?? '',
    originalPrice: `¥${(goods.originalPrice ?? 0).toFixed(2)}`,
    creditScore: goods.credit ?? null,
    itemId: goods.goodsId,
  }
}

/** 信誉分低于 70 显示黄色，低于 50 显示红色 */
function creditScoreClass(credit: number | null) {
  if (credit == null) return ''
  if (credit < 50) return 'credit-danger'
  if (credit < 70) return 'credit-warning'
  return ''
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
  loadRecommend()
  setupObserver()
  startBannerTimer()
  // 首帧先定位条纹，再开启过渡，避免初始加载时出现滑动
  nextTick(() => {
    updateIndicator()
    nextTick(() => {
      indicatorReady.value = true
    })
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  observer?.disconnect()
  stopBannerTimer()
  window.removeEventListener('resize', handleResize)
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

/* ===== 手风琴轮播图 ===== */
.accordion-carousel {
  display: flex;
  gap: 12px;
  height: 300px;
  margin-top: 32px;
  user-select: none;
}

.accordion-item {
  position: relative;
  flex: 1;
  min-width: 0;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  background: #e8e8ed;
  transition: flex 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion-item.is-active {
  flex: 5;
}

.accordion-item img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scale(1);
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion-item.is-active img {
  transform: scale(1.05);
}

.accordion-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.1) 55%, transparent 100%);
  opacity: 0.6;
  transition: opacity 0.4s ease;
}

.accordion-item.is-active .accordion-mask,
.accordion-item:hover .accordion-mask {
  opacity: 1;
}

.accordion-label {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 20px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #ffffff;
}

.accordion-item:not(.is-active) .accordion-label {
  align-items: flex-start;
}

.accordion-title {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.19;
  letter-spacing: 0.231px;
  white-space: nowrap;
  writing-mode: vertical-rl;
  transition: opacity 0.3s ease;
}

.accordion-item.is-active .accordion-title {
  writing-mode: horizontal-tb;
  font-size: 28px;
}

/* 无数据占位：灰色背景 + 灰色占位文本 */
.accordion-label.is-placeholder {
  color: #8e8e93;
}

.accordion-label.is-placeholder .accordion-title {
  writing-mode: horizontal-tb;
  font-size: 22px;
  letter-spacing: 2px;
}

.accordion-subtitle {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  white-space: nowrap;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    opacity 0.4s ease,
    max-height 0.4s ease;
}

.accordion-item.is-active .accordion-subtitle {
  opacity: 0.85;
  max-height: 24px;
}

@media (max-width: 900px) {
  .accordion-carousel {
    height: 220px;
  }

  .accordion-title {
    font-size: 18px;
  }

  .accordion-item.is-active .accordion-title {
    font-size: 22px;
  }
}

@media (max-width: 600px) {
  .accordion-carousel {
    height: 180px;
    gap: 8px;
  }

  .accordion-label {
    left: 14px;
    right: 14px;
    bottom: 14px;
  }

  .accordion-title {
    font-size: 15px;
  }

  .accordion-item.is-active .accordion-title {
    font-size: 18px;
  }

  .accordion-subtitle {
    display: none;
  }
}

/* ===== 分类标签 ===== */
.category-tabs {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.category-tabs__inner {
  position: relative;
  display: inline-flex;
  gap: 8px;
  padding-bottom: 10px;
}

.category-tab {
  position: relative;
  appearance: none;
  border: none;
  background: transparent;
  min-width: 96px;
  padding: 6px 14px;
  text-align: center;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: -0.374px;
  color: #7a7a7a;
  cursor: pointer;
  border-radius: 8px;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.category-tab:hover {
  color: #1d1d1f;
  background: rgba(0, 0, 0, 0.04);
}

.category-tab.is-active {
  color: #0066cc;
  font-weight: 600;
}

.category-tabs__indicator {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  border-radius: 2px;
  background: #0066cc;
  will-change: transform;
}

/* 条纹为绝对定位的独立元素；只对 transform 做过渡，
   避免 width 让整个动画退化为需要主线程参与的非合成动画 */
.category-tabs__indicator.is-ready {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
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

.product-credit-score.credit-warning {
  color: var(--color-caution, #ff9f0a);
}

.product-credit-score.credit-danger {
  color: var(--color-warning, #ff3b30);
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
