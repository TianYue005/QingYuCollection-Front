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
          <div class="product-cover">
            <img
              :src="item.imgUrl"
              alt="商品图片"
              :style="{ aspectRatio: item.imgWidth + '/' + item.imgHeight }"
            />
            <button
              class="delete-btn"
              type="button"
              :disabled="deletingId === item.goodsId"
              @click.stop="handleDelete(item)"
            >
              {{ deletingId === item.goodsId ? '删除中' : '删除' }}
            </button>
          </div>
          <div class="product-name">{{ item.goodsDesc }}</div>
          <div class="tags-row">
            <span v-for="tag in item.tagList" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="item-footer">
            <span class="product-price">{{ item.price }}</span>
            <span v-if="item.originalPrice" class="product-original-price">{{ item.originalPrice }}</span>
            <div class="item-actions">
              <button
                class="recommend-btn"
                type="button"
                :disabled="recommendingId === item.goodsId"
                @click.stop="handleRecommend(item)"
              >
                {{ recommendingId === item.goodsId ? '提交中' : '购买推荐位' }}
              </button>
              <button class="edit-price-btn" type="button" @click.stop="openEditPrice(item)">
                修改价格
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改价格弹窗 -->
    <el-dialog
      v-model="editPriceVisible"
      class="price-dialog"
      title="修改价格"
      width="380px"
      :close-on-click-modal="false"
      @closed="resetEditPrice"
    >
      <div class="edit-price-form">
        <span class="edit-price-label">新价格（元）</span>
        <el-input-number
          v-model="newPrice"
          :min="0.01"
          :precision="2"
          :step="1"
          :controls="false"
          placeholder="请输入新的价格"
          style="width: 100%"
        />
      </div>
      <template #footer>
        <el-button :disabled="editSubmitting" @click="editPriceVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="submitEditPrice">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { getMyItems, deleteItem, updateItemPrice, recommendItem, type GoodsVO } from '@/api/item'
import { toast } from '@/utils/message'

const router = useRouter()
const goToItem = (id: string) => {
  router.push({ name: 'item', params: { id } })
}

interface TreasureItem {
  goodsId: string
  goodsDesc: string
  /** 展示用价格文本 */
  price: string
  /** 数值价格，用于修改价格时回填 */
  priceValue: number
  originalPrice: string
  imgUrl: string
  imgWidth: number
  imgHeight: number
  tagList: string[]
}

const loading = ref(false)
const productList = ref<TreasureItem[]>([])
const deletingId = ref<string | null>(null)

function mapGoodsToTreasure(goods: GoodsVO): TreasureItem {
  const firstImg = goods.imgList?.[0]
  return {
    goodsId: goods.goodsId,
    goodsDesc: goods.goodsDesc || '暂无描述',
    price: `¥${(goods.price ?? 0).toFixed(2)}`,
    priceValue: goods.price ?? 0,
    originalPrice: goods.originalPrice ? `¥${goods.originalPrice.toFixed(2)}` : '',
    imgUrl: firstImg?.imgUrl || 'https://picsum.photos/200/300',
    imgWidth: firstImg?.imgWidth || 200,
    imgHeight: firstImg?.imgHeight || 300,
    tagList: goods.tag ?? [],
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

async function handleDelete(item: TreasureItem) {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确定要删除该商品吗？', '删除商品', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  deletingId.value = item.goodsId
  try {
    const res = await deleteItem(item.goodsId)
    if (res.code === 1) {
      productList.value = productList.value.filter((p) => p.goodsId !== item.goodsId)
      toast.success('删除成功')
    } else {
      toast.error(res.msg || '删除失败')
    }
  } catch {
    toast.error('删除失败，交易中的商品不可删除')
  } finally {
    deletingId.value = null
  }
}

/* ---- 购买推荐位 ---- */
const recommendingId = ref<string | null>(null)

async function handleRecommend(item: TreasureItem) {
  try {
    await ElMessageBox.confirm(
      '购买后该商品会展示在校园市场的推荐区，确定要购买推荐位吗？',
      '购买推荐位',
      {
        confirmButtonText: '确定购买',
        cancelButtonText: '取消',
        type: 'info',
      },
    )
  } catch {
    return
  }

  recommendingId.value = item.goodsId
  try {
    const res = await recommendItem(item.goodsId)
    if (res.code === 1) {
      toast.success(res.msg || '推荐位购买成功')
    } else {
      toast.error(res.msg || '推荐位购买失败')
    }
  } catch {
    toast.error('推荐位购买失败')
  } finally {
    recommendingId.value = null
  }
}

/* ---- 修改价格 ---- */
const editPriceVisible = ref(false)
const editSubmitting = ref(false)
const editingItem = ref<TreasureItem | null>(null)
const newPrice = ref<number | undefined>(undefined)

function openEditPrice(item: TreasureItem) {
  editingItem.value = item
  newPrice.value = item.priceValue
  editPriceVisible.value = true
}

function resetEditPrice() {
  editingItem.value = null
  newPrice.value = undefined
}

async function submitEditPrice() {
  const item = editingItem.value
  if (!item) return
  const price = newPrice.value
  if (price === undefined || price === null || Number.isNaN(price) || price <= 0) {
    toast.error('请输入有效的价格')
    return
  }

  editSubmitting.value = true
  try {
    const res = await updateItemPrice(item.goodsId, price)
    if (res.code === 1) {
      item.priceValue = price
      item.price = `¥${price.toFixed(2)}`
      toast.success('价格修改成功')
      editPriceVisible.value = false
    } else {
      toast.error(res.msg || '修改价格失败')
    }
  } catch {
    toast.error('修改价格失败')
  } finally {
    editSubmitting.value = false
  }
}
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

.product-cover {
  position: relative;
}

.product-item img {
  width: 100%;
  display: block;
}

.delete-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 12px;
  border: none;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  color: #ffffff;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.delete-btn:hover {
  background: rgba(229, 57, 53, 0.9);
}

.delete-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
  flex-wrap: wrap;
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

/* ---- 卡片操作按钮组 ---- */
.item-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* ---- 购买推荐位：主操作胶囊按钮（Action Blue 填充） ---- */
.recommend-btn {
  padding: 6px 16px;
  border: 1px solid var(--color-primary);
  border-radius: var(--rounded-pill);
  background: var(--color-primary);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-on-primary);
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.15s ease,
    opacity 0.2s ease;
}

.recommend-btn:hover {
  background: var(--color-primary-focus);
  border-color: var(--color-primary-focus);
}

.recommend-btn:active {
  transform: scale(0.95);
}

.recommend-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.recommend-btn:disabled:active {
  transform: none;
}

/* ---- 修改价格：次级胶囊按钮（透明底 + 1px Action Blue 描边） ---- */
.edit-price-btn {
  padding: 6px 16px;
  border: 1px solid var(--color-primary);
  border-radius: var(--rounded-pill);
  background: transparent;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-primary);
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background-color 0.2s ease,
    transform 0.15s ease;
}

.edit-price-btn:hover {
  background: rgba(0, 102, 204, 0.06);
}

.edit-price-btn:active {
  transform: scale(0.95);
}

/* ---- 修改价格弹窗 ---- */
.edit-price-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.edit-price-label {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-48);
}

.treasure :deep(.price-dialog) {
  --el-dialog-border-radius: var(--rounded-lg);
  --el-dialog-padding-primary: 0;
  background: var(--color-surface-pearl);
  box-shadow: none;
}

.treasure :deep(.price-dialog .el-dialog__header) {
  padding: var(--spacing-lg) var(--spacing-lg) 0;
  margin-right: 0;
}

.treasure :deep(.price-dialog .el-dialog__title) {
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: var(--color-ink);
}

.treasure :deep(.price-dialog .el-dialog__headerbtn) {
  top: var(--spacing-md);
  right: var(--spacing-md);
}

.treasure :deep(.price-dialog .el-dialog__close) {
  color: var(--color-ink-muted-48);
}

.treasure :deep(.price-dialog .el-dialog__headerbtn:hover .el-dialog__close) {
  color: var(--color-ink);
}

.treasure :deep(.price-dialog .el-dialog__body) {
  padding: var(--spacing-lg) var(--spacing-lg) 0;
}

.treasure :deep(.price-dialog .el-dialog__footer) {
  padding: var(--spacing-lg);
}

/* 输入框：canvas 白底 + hairline 描边，聚焦时用 Focus Blue */
.treasure :deep(.price-dialog .el-input__wrapper) {
  height: 48px;
  padding: 0 var(--spacing-md);
  border-radius: var(--rounded-md);
  background: var(--color-canvas);
  box-shadow: 0 0 0 1px var(--color-hairline) inset;
  transition: box-shadow 0.2s ease;
}

.treasure :deep(.price-dialog .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-surface-chip-translucent) inset;
}

.treasure :deep(.price-dialog .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--color-primary-focus) inset;
}

.treasure :deep(.price-dialog .el-input__inner) {
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink);
  text-align: left;
}

.treasure :deep(.price-dialog .el-input__inner::placeholder) {
  color: var(--color-ink-muted-48);
}

/* 按钮：主操作为 Action Blue 胶囊，次操作为描边胶囊 */
.treasure :deep(.price-dialog .el-button) {
  height: 44px;
  padding: 0 21px;
  border-radius: var(--rounded-pill);
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.374px;
  transition:
    background-color 0.2s ease,
    transform 0.15s ease;
}

.treasure :deep(.price-dialog .el-button:not(.el-button--primary)) {
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

.treasure :deep(.price-dialog .el-button:not(.el-button--primary):hover) {
  background: rgba(0, 102, 204, 0.06);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.treasure :deep(.price-dialog .el-button--primary) {
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: var(--color-on-primary);
}

.treasure :deep(.price-dialog .el-button--primary:hover) {
  background: var(--color-primary-focus);
  border-color: var(--color-primary-focus);
  color: var(--color-on-primary);
}

.treasure :deep(.price-dialog .el-button:active) {
  transform: scale(0.95);
}

.treasure :deep(.price-dialog .el-button:focus-visible) {
  outline: 2px solid var(--color-primary-focus);
  outline-offset: 2px;
}

.treasure :deep(.price-dialog .el-button.is-disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.treasure :deep(.price-dialog .el-button.is-disabled:active) {
  transform: none;
}
</style>
