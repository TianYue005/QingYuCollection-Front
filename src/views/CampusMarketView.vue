<template>
  <div class="campus-market">
    <div class="main-container">
      <!-- 搜索框 -->
      <div class="search-box">
        <el-icon><Search /></el-icon>
        <input v-model="searchText" type="text" class="search-input" placeholder="搜索商品" />
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
        <p class="empty-state__title">暂无商品</p>
        <p class="empty-state__desc">还没有人发布闲置，快去发布第一个吧</p>
      </div>

      <!-- 商品列表 -->
      <div v-else class="product-list-container">
        <div
          v-for="(item, index) in productList"
          :key="index"
          class="product-item"
          @click="goToItem(item.itemId)"
        >
          <img :src="item.image" alt="商品图片" />
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

      <!-- 加载更多 -->
      <div v-if="productList.length > 0" class="load-more-wrapper">
        <button class="load-more-btn" :disabled="loading || !hasMore" @click="loadMore">
          <template v-if="loading">加载中...</template>
          <template v-else-if="!hasMore">没有更多了</template>
          <template v-else>加载更多</template>
        </button>
        <span class="load-more-count" v-if="total > 0">
          已加载 {{ productList.length }} / {{ total }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { getItemsToPage, type GoodsVO } from '@/api/item'

const router = useRouter()
const goToItem = (id: string | number) => {
  router.push({ name: 'item', params: { id: String(id) } })
}
const searchText = ref('')

interface ProductItem {
  image: string
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
  const firstImg = goods.imgList?.[0]?.imgUrl
  return {
    image: firstImg || 'https://picsum.photos/200/300',
    description: goods.goodsDesc,
    price: `¥${(goods.price ?? 0).toFixed(2)}`,
    sellerProfilePicture: 'https://picsum.photos/50/50',
    sellerNickname: '卖家昵称',
    originalPrice: `¥${(goods.originalPrice ?? 0).toFixed(2)}`,
    creditScore: '100',
    itemId: String(goods.goodsId),
  }
}

async function fetchPage(isLoadMore = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await getItemsToPage({
      pageNumber: page.value,
      pageSize,
    })
    if (res.code === 1 && res.data) {
      const { total: t, rows } = res.data
      total.value = t
      const mapped = rows.map(mapGoodsToProduct)
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

function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  fetchPage(true)
}

onMounted(() => {
  fetchPage()
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

.product-list-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  padding: 32px 0;
}

.product-item {
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
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
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

/* ===== 加载更多 ===== */
.load-more-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
}

.load-more-btn {
  padding: 11px 48px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #0066cc;
  background: transparent;
  border: 1px solid #0066cc;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.1s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: #0066cc;
  color: #ffffff;
}

.load-more-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.load-more-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: #7a7a7a;
  border-color: #e0e0e0;
}

.load-more-count {
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
}
</style>
