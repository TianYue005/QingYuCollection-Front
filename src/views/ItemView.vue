<template>
  <div class="page">
    <!-- 加载中 -->
    <div v-if="loading" class="status-box">
      <p class="status-box__text">加载中...</p>
    </div>

    <!-- 商品不存在 -->
    <div v-else-if="notFound" class="status-box">
      <p class="status-box__text">商品不存在或已下架</p>
    </div>

    <template v-else>
      <div class="seller-card">
        <div class="seller-card__avatar">
          <img :src="sellerDetail?.sellerAvatar || ''" alt="卖家头像" />
        </div>
        <div class="seller-card__body">
          <div class="seller-card__name">{{ sellerDetail?.sellerName }}</div>
          <div class="seller-card__meta">
            <span>{{ lastSeenText }}</span>
            <span class="seller-card__separator" aria-hidden="true"></span>
            <span>{{ registerText }}</span>
            <span class="seller-card__separator" aria-hidden="true"></span>
            <span>{{ soldText }}</span>
            <span class="seller-card__separator" aria-hidden="true"></span>
            <span>{{ goodRateText }}</span>
          </div>
        </div>
      </div>

      <div class="gallery">
        <el-carousel height="375px" motion-blur>
          <el-carousel-item v-for="url in carouselItems" :key="url">
            <img :src="url" alt="" class="gallery__image" @click="openPreview(url)" />
          </el-carousel-item>
        </el-carousel>
      </div>

      <div class="product-detail">
        <div class="product-detail__price-row">
          <span class="product-detail__price">&yen;{{ product?.price }}</span>
          <span class="product-detail__original-price">&yen;{{ product?.originalPrice }}</span>
        </div>

        <span class="product-detail__condition">{{ product?.productStatus }}</span>

        <p class="product-detail__desc">{{ product?.productDesc }}</p>

        <div class="product-detail__actions">
          <div class="product-detail__actions-row">
            <button class="btn-chat">聊一聊</button>
            <button
              class="btn-favorite"
              :class="{ 'is-favorited': isFavorited }"
              @click="toggleFavorite"
            >
              <svg
                class="btn-favorite__icon"
                viewBox="0 0 24 24"
                :fill="isFavorited ? '#0066cc' : 'none'"
                :stroke="isFavorited ? '#0066cc' : '#0066cc'"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                />
              </svg>
              <span>{{ isFavorited ? '已收藏' : '收藏' }}</span>
            </button>
          </div>
          <button class="btn-buy">购买</button>
        </div>
      </div>

      <!-- 图片预览模态框 -->
      <Teleport to="body">
        <div
          v-if="previewVisible"
          class="image-preview-overlay"
          @mousedown="onPreviewOverlayMouseDown"
          @wheel.prevent="onPreviewWheel"
          @click.self="closePreview"
        >
          <button class="image-preview-close" @click="closePreview">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            :src="previewUrl"
            alt=""
            class="image-preview-img"
            :style="previewImgStyle"
            @mousedown.stop="onPreviewImgMouseDown"
            @dragstart.prevent
          />
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import { ElCarousel, ElCarouselItem } from 'element-plus'
import { getItemById, type GoodsVO } from '@/api/item'

const route = useRoute()
const itemId: string = route.params.id as string

type SellerDetail = {
  sellerAvatar: string
  sellerName: string
  overTime: number
  sellerRegisterTime: number
  sellerSellCount: number
  sellerGoodRate: number
}

type ProductDetail = {
  productDesc: string
  price: number
  originalPrice: number
  productStatus: string
}

const carouselItems = ref<string[]>([])
const product = ref<ProductDetail>({} as ProductDetail)
const sellerDetail = ref<SellerDetail>()
const isFavorited = ref(false)
const loading = ref(false)
const notFound = ref(false)
const previewVisible = ref(false)
const previewUrl = ref('')
const previewScale = ref(1)
const previewX = ref(0)
const previewY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragOriginX = ref(0)
const dragOriginY = ref(0)

const previewImgStyle = computed(() => ({
  transform: `translate(${previewX.value}px, ${previewY.value}px) scale(${previewScale.value})`,
  cursor: isDragging.value ? 'grabbing' : 'grab',
  transition: isDragging.value ? 'none' : 'transform 0.15s ease',
}))

function openPreview(url: string) {
  previewUrl.value = url
  previewScale.value = 1
  previewX.value = 0
  previewY.value = 0
  previewVisible.value = true
}

function closePreview() {
  previewVisible.value = false
}

function onPreviewWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.min(Math.max(previewScale.value + delta, 0.3), 5)
  // 以鼠标位置为中心缩放
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseX = e.clientX - rect.left - rect.width / 2
  const mouseY = e.clientY - rect.top - rect.height / 2
  const ratio = newScale / previewScale.value
  previewX.value = mouseX + ratio * (previewX.value - mouseX)
  previewY.value = mouseY + ratio * (previewY.value - mouseY)
  previewScale.value = newScale
}

function onPreviewImgMouseDown(e: MouseEvent) {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  dragOriginX.value = previewX.value
  dragOriginY.value = previewY.value

  const onMove = (ev: MouseEvent) => {
    if (!isDragging.value) return
    previewX.value = dragOriginX.value + (ev.clientX - dragStartX.value)
    previewY.value = dragOriginY.value + (ev.clientY - dragStartY.value)
  }
  const onUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function onPreviewOverlayMouseDown(e: MouseEvent) {
  // 点击遮罩背景（非图片区域）时关闭
  if (e.target === e.currentTarget) {
    closePreview()
  }
}

const toggleFavorite = () => {
  isFavorited.value = !isFavorited.value
}

const lastSeenText = computed(() => {
  const t = sellerDetail.value?.overTime ?? 0
  return t <= 3 ? '刚刚来过' : `${t}分钟前来过`
})

const registerText = computed(() => {
  const days = sellerDetail.value?.sellerRegisterTime ?? 0
  return days <= 365 ? `已注册 ${days} 天` : `已注册 ${Math.floor(days / 365)} 年`
})

const soldText = computed(() => {
  const count = sellerDetail.value?.sellerSellCount ?? 0
  return `已卖出 ${count} 件`
})

const goodRateText = computed(() => {
  const rate = sellerDetail.value?.sellerGoodRate ?? 0
  return `好评率 ${rate}%`
})

async function fetchItem() {
  loading.value = true
  notFound.value = false
  try {
    const res = await getItemById(itemId)
    if (res.code === 1 && res.data) {
      const item: GoodsVO = res.data
      product.value = {
        productDesc: item.goodsDesc || '',
        price: item.price ?? 0,
        originalPrice: item.originalPrice ?? 0,
        productStatus: item.tags?.split(',')[0] ?? '',
      }
      // 从 imgList 填充轮播图
      carouselItems.value = item.imgList?.map((img) => img.imgUrl) ?? []
    } else {
      notFound.value = true
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchItem()
})
</script>

<style scoped>
/*
 * Apple Design System tokens
 * 字号 / 行高:  display-md 34/1.47 | tagline 21/1.19 | body-strong 17/1.24
 *                body 17/1.47 | caption 14/1.43 | caption-strong 14/1.29
 * 颜色:         ink #1d1d1f | ink-muted #7a7a7a | hairline #e0e0e0
 *               primary #0066cc | on-primary #fff | parchment #f5f5f7
 * 间距:         8px 网格体系
 * 圆角:         9999px 胶囊按钮
 */

.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 17px 48px;
  background: #f5f5f7;
  min-height: 100vh;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
}

/* ==================== 状态提示 ==================== */

.status-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.status-box__text {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #7a7a7a;
}

/* ==================== 卖家卡片 ==================== */

.seller-card {
  display: flex;
  align-items: center;
  gap: 17px;
  padding: 17px 0;
  border-bottom: 1px solid #e0e0e0;
}

.seller-card__avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  overflow: hidden;
}

.seller-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.seller-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.seller-card__name {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.24;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

.seller-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #7a7a7a;
}

.seller-card__separator {
  display: inline-block;
  width: 1px;
  height: 12px;
  background: #e0e0e0;
}

/* ==================== 图片展示 ==================== */

.gallery {
  margin: 24px 0;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px;
}

.gallery__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

/* ==================== 商品详情 ==================== */

.product-detail {
  background: #ffffff;
  border-radius: 18px;
  padding: 32px;
}

.product-detail__price-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 17px;
}

.product-detail__price {
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: #1d1d1f;
}

.product-detail__original-price {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #7a7a7a;
  text-decoration: line-through;
}

.product-detail__condition {
  display: inline-block;
  margin-bottom: 24px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: #1d1d1f;
  background: #f5f5f7;
  border-radius: 11px;
}

.product-detail__desc {
  margin: 0 0 32px;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

/* ==================== 操作按钮 ==================== */

.product-detail__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-detail__actions-row {
  display: flex;
  gap: 12px;
}

/* 聊一聊 — secondary pill */
.btn-chat {
  flex: 1;
  padding: 11px 22px;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #0066cc;
  background: transparent;
  border: 1px solid #0066cc;
  border-radius: 9999px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.btn-chat:active {
  transform: scale(0.95);
}

/* 收藏 — secondary pill */
.btn-favorite {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 22px;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #0066cc;
  background: transparent;
  border: 1px solid #0066cc;
  border-radius: 9999px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.btn-favorite:active {
  transform: scale(0.95);
}

.btn-favorite.is-favorited {
  color: #0066cc;
}

.btn-favorite__icon {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

/* 购买 — primary pill */
.btn-buy {
  display: block;
  width: 100%;
  padding: 14px 28px;
  font-size: 18px;
  font-weight: 300;
  line-height: 1;
  color: #ffffff;
  background: #0066cc;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.btn-buy:active {
  transform: scale(0.95);
}

/* ==================== 图片预览模态框 ==================== */

.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-preview-close {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.2s ease;
}

.image-preview-close svg {
  width: 20px;
  height: 20px;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.image-preview-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  will-change: transform;
}
</style>
