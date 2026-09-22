<template>
  <div class="treasure">
    <div class="main-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-dots">
          <span class="dot" :style="{ animationDelay: '0s' }"></span>
          <span class="dot" :style="{ animationDelay: '0.2s' }"></span>
          <span class="dot" :style="{ animationDelay: '0.4s' }"></span>
        </div>
        <p class="loading-text">正在加载</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="productList.length === 0" class="empty-state">
        <div class="empty-state__icon">
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="8" y="12" width="48" height="40" rx="4" />
            <circle cx="22" cy="28" r="4" />
            <path d="M8 44l12-10 8 6 12-10 16 12" />
          </svg>
        </div>
        <p class="empty-state__title">还没有发布商品</p>
        <p class="empty-state__desc">发布你的闲置商品，让更多人看到吧</p>
      </div>

      <!-- 商品列表：瀑布流 -->
      <div v-else class="waterfall-container">
        <div
          v-for="item in productList"
          :key="item.goodsId"
          class="product-item"
          @click="goToItem(item.goodsId)"
        >
          <img
            :src="item.imgUrl"
            alt="商品图片"
            :style="{ aspectRatio: item.imgWidth + '/' + item.imgHeight }"
          />
          <div class="product-name">{{ item.goodsDesc }}</div>
          <div class="tags-row">
            <span v-for="tag in item.tagList" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="item-footer">
            <span class="product-price">{{ item.price }}</span>
            <span v-if="item.originalPrice" class="product-original-price">{{ item.originalPrice }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyItems, type GoodsVO } from '@/api/item'

const router = useRouter()
const goToItem = (id: string) => {
  router.push({ name: 'item', params: { id } })
}

interface TreasureItem {
  goodsId: string
  goodsDesc: string
  price: string
  originalPrice: string
  imgUrl: string
  imgWidth: number
  imgHeight: number
  tagList: string[]
}

const loading = ref(false)
const productList = ref<TreasureItem[]>([])

function mapGoodsToTreasure(goods: GoodsVO): TreasureItem {
  const firstImg = goods.imgList?.[0]
  return {
    goodsId: goods.goodsId,
    goodsDesc: goods.goodsDesc || '暂无描述',
    price: `¥${(goods.price ?? 0).toFixed(2)}`,
    originalPrice: goods.originalPrice ? `¥${goods.originalPrice.toFixed(2)}` : '',
    imgUrl: firstImg?.imgUrl || 'https://picsum.photos/200/300',
    imgWidth: firstImg?.imgWidth || 200,
    imgHeight: firstImg?.imgHeight || 300,
    tagList: goods.tags
      ? goods.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
  }
}

async function fetchMyItems() {
  loading.value = true
  try {
    const res = await getMyItems()
    if (res.code === 1 && res.data) {
      productList.value = (res.data.rows || []).map(mapGoodsToTreasure)
    }
  } catch {
    console.error('获取我的商品失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMyItems()
})
</script>

<style scoped>
.treasure {
  padding: 0 0 48px 0;
  background: #f5f5f7;
  min-height: 100vh;
}

.main-container {
  width: 80%;
  margin: 0 auto;
  padding-top: 32px;
}

/* ===== 加载状态 ===== */
.loading-state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 120px 0;
}

.loading-dots {
  display: flex;
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

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
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

/* ===== 商品瀑布流 ===== */
.waterfall-container {
  column-count: 4;
  column-gap: 24px;
  padding: 24px 0;
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

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 17px 0;
}

.tag {
  padding: 2px 8px;
  border-radius: 9999px;
  background: #f0f0f0;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  color: #7a7a7a;
}

.item-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 17px 17px;
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
</style>
