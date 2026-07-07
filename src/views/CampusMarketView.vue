<template>
  <div class="campus-market">
    <div class="main-container">
      <!-- 搜索框 -->
      <div class="search-box">
        <el-icon><Search /></el-icon>
        <input v-model="searchText" type="text" class="search-input" placeholder="搜索商品" />
      </div>
      <!-- 猜你想搜 -->
      <div class="search-suggestions">
        <span class="suggestions-label">猜你想搜：</span>
        <div class="suggestions-chips">
          <span
            v-for="(item, index) in suggestions"
            :key="index"
            class="suggestion-chip"
            :class="{ 'chip-hovered': hoveredIndex === index }"
            @click="searchText = item"
            @mouseenter="onChipEnter(index)"
            @mouseleave="onChipLeave"
            >{{ item }}
          </span>
        </div>
      </div>
      <!-- 商品列表 -->
      <div class="product-list-container">
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
    </div>
  </div>

  <!-- 右侧悬浮固定按钮 -->
  <div class="floating-buttons-container">
    <FloatingButtons />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import FloatingButtons from '@/components/FloatingButtons.vue'

const router = useRouter()
const goToItem = (id: string) => {
  router.push({ name: 'item', params: { id } })
}
const searchText = ref('')

const hoveredIndex = ref(-1)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

function onChipEnter(index: number) {
  hoverTimer = setTimeout(() => {
    hoveredIndex.value = index
  }, 300)
}

function onChipLeave() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  hoveredIndex.value = -1
}

const suggestions = Array.from({ length: 8 }, () => '偏好数据')

const productList = Array.from({ length: 10 }, () => ({
  image: 'https://picsum.photos/200/300', //商品图片
  description: '商品描述', //商品描述
  price: '¥100.00', //商品价格
  sellerProfilePicture: 'https://picsum.photos/50/50', //卖家头像
  sellerNickname: '卖家昵称', //卖家昵称
  originalPrice: '¥100.00', //原始价格
  currentPrice: '¥90.00', //当前价格
  creditScore: '100', //信用积分
  itemId: '123456', //商品ID
}))
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

.search-suggestions {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 33.33%;
  margin: 17px auto 0;
  flex-wrap: wrap;
}

.suggestions-label {
  flex-shrink: 0;
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
  padding-top: 5px;
}

.suggestions-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-chip {
  display: inline-block;
  padding: 8px 15px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: #333333;
  background: #fafafc;
  border-radius: 11px;
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.chip-hovered {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
</style>
