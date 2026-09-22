<template>
  <div class="pending-view">
    <!-- 加载状态 -->
    <div v-if="loading" class="state-box">
      <div class="loading-dots">
        <span class="dot" :style="{ animationDelay: '0s' }"></span>
        <span class="dot" :style="{ animationDelay: '0.2s' }"></span>
        <span class="dot" :style="{ animationDelay: '0.4s' }"></span>
      </div>
      <p class="loading-text">正在加载待处理交易</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="list.length === 0" class="state-box">
      <div class="empty-icon">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="8" y="12" width="48" height="40" rx="4" />
          <circle cx="22" cy="28" r="4" />
          <path d="M8 44l12-10 8 6 12-10 16 12" />
        </svg>
      </div>
      <p class="empty-title">暂无待处理交易</p>
      <p class="empty-desc">发布闲置商品后，这里会展示它们的交易状态</p>
    </div>

    <!-- 横条列表 -->
    <div v-else class="row-list">
      <div v-for="item in list" :key="String(item.goodsId)" class="pending-row">
        <img class="row-img" :src="picOf(item)" alt="商品图片" />
        <div class="row-info">
          <div class="row-desc">{{ item.goodsDesc || '暂无描述' }}</div>
          <div class="row-price">¥{{ fmtPrice(item.price) }}</div>
        </div>
        <button class="detail-btn" @click="openDetail(item)">查看详情</button>
      </div>
    </div>

    <!-- 查看详情弹窗 -->
    <div v-if="current" class="modal-mask" @click.self="closeDetail">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">进行中的交易</div>
          <button class="modal-close" @click="closeDetail" aria-label="关闭">×</button>
        </div>

        <!-- 商品概要 -->
        <div class="goods-summary">
          <img class="goods-img" :src="picOf(current)" alt="商品图片" />
          <div class="goods-info">
            <div class="goods-desc">{{ current.goodsDesc || '暂无描述' }}</div>
            <div class="goods-price">¥{{ fmtPrice(current.price) }}</div>
          </div>
        </div>

        <div class="modal-body">
          <!-- 你的操作码 -->
          <div class="modal-label">你的操作码是</div>
          <div class="code-box" @click="codeRevealed = !codeRevealed">
            <template v-if="codeRevealed">
              <span class="code-text">{{ myCode }}</span>
              <span class="code-tip">点击隐藏</span>
            </template>
            <template v-else>
              <span class="code-placeholder">点击此处展示操作码</span>
            </template>
          </div>
          <button v-if="codeRevealed && myCode" class="copy-btn" @click="copyMyCode">复制验证码</button>

          <div class="modal-divider"></div>

          <!-- 输入对方的操作码 -->
          <div class="modal-label">输入对方的操作码以申请完成交易</div>
          <div class="input-row">
            <input
              v-model="otherCode"
              class="code-input"
              type="text"
              maxlength="10"
              placeholder="请输入对方的操作码"
              @keyup.enter="onApply"
            />
            <button class="submit-btn" :disabled="!otherCode || submitting" @click="onApply">
              {{ submitting ? '提交中…' : '申请完成交易' }}
            </button>
          </div>

          <!-- 取消交易 -->
          <div class="cancel-row">
            <button class="cancel-btn" @click="onCancel">不想交易了？点击取消交易以拒绝</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { toast } from '@/utils/message'
import { getMyVerifyCode, getUserPending, submitOtherVerifyCode, type Pending } from '@/api/user'

const loading = ref(false)
const list = ref<Pending[]>([])

/** 当前查看详情的商品（非空即弹窗打开） */
const current = ref<Pending | null>(null)
/** 操作码是否已展示 */
const codeRevealed = ref(false)
/** 我的操作码（打开弹窗后由接口获取） */
const myCode = ref('')
/** 我的操作码是否加载中 */
const myCodeLoading = ref(false)
/** 是否正在提交对方的操作码 */
const submitting = ref(false)
/** 对方操作码输入 */
const otherCode = ref('')

/** 商品图片（无图时兜底占位） */
function picOf(item: Pending): string {
  return item.picture && item.picture.trim() ? item.picture : `https://picsum.photos/seed/${item.goodsId}/200/200`
}

/** 价格格式化（BigDecimal 可能以字符串下发） */
function fmtPrice(price?: number | string): string {
  const n = Number(price ?? 0)
  return Number.isNaN(n) ? '0.00' : n.toFixed(2)
}

function openDetail(item: Pending) {
  current.value = item
  codeRevealed.value = false
  otherCode.value = ''
  loadMyCode(item.goodsId)
}

function closeDetail() {
  current.value = null
}

/** 获取自己的操作码（请求 TradePairUp 必须携带 goodsId） */
async function loadMyCode(goodsId: number | string) {
  myCodeLoading.value = true
  myCode.value = ''
  try {
    myCode.value = await getMyVerifyCode(goodsId)
  } catch (error) {
    console.error('获取我的操作码失败:', error)
    myCode.value = ''
  } finally {
    myCodeLoading.value = false
  }
}

/** 复制我的操作码到剪贴板 */
async function copyMyCode() {
  const text = myCode.value
  if (!text) return
  try {
    // 剪贴板 API 仅在安全上下文可用，失败时走下方回退方案
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  toast.success('验证码已复制')
}

/** 提交对方的操作码，根据后端返回值提示对应结果 */
async function onApply() {
  const code = otherCode.value.trim()
  if (!code || !current.value || submitting.value) return
  submitting.value = true
  try {
    const res = await submitOtherVerifyCode({
      goodsId: current.value.goodsId,
      otherVerifyCode: code,
      operate: 1,
    })
    const state = Number(res)
    if (state === 1) {
      await ElMessageBox.alert('请等待对方填写验证码以完成交易', '提示', { confirmButtonText: '知道了' })
    } else if (state === 2) {
      await ElMessageBox.alert('交易完成，重新加载界面以刷新数据', '提示', { confirmButtonText: '确定' })
      closeDetail()
      fetchPending()
    } else {
      await ElMessageBox.alert('交易过程发生错误', '提示', { confirmButtonText: '知道了' })
    }
  } catch (error) {
    console.error('填写对方操作码失败:', error)
    toast.error('请求失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

/** 占位动作：取消交易（接口待接入） */
function onCancel() {
  alert('取消交易：接口待接入')
}

async function fetchPending() {
  loading.value = true
  try {
    const res = await getUserPending()
    list.value = Array.isArray(res) ? res : []
  } catch (error) {
    console.error('获取待处理交易失败:', error)
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchPending)
</script>

<style scoped>
.pending-view {
  padding: 8px 0 48px;
}

/* ===== 通用状态 ===== */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  text-align: center;
}

.loading-dots {
  display: flex;
  align-items: center;
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

.loading-text {
  margin: 12px 0 0;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  color: #7a7a7a;
}

.empty-icon {
  width: 72px;
  height: 72px;
  color: #c0c0c0;
  margin-bottom: 20px;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.empty-title {
  margin: 0 0 8px;
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 19px;
  font-weight: 600;
  color: #1d1d1f;
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: #7a7a7a;
}

/* ===== 横条列表 ===== */
.row-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
}

.pending-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.pending-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.row-img {
  width: 76px;
  height: 76px;
  flex-shrink: 0;
  border-radius: 10px;
  object-fit: cover;
  background: #f0f0f3;
}

.row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row-desc {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #1d1d1f;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row-price {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #e53935;
}

.detail-btn {
  flex-shrink: 0;
  padding: 8px 18px;
  border: none;
  border-radius: 9999px;
  background: #0071e3;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.detail-btn:hover {
  background: #0077ed;
}

/* ===== 弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  padding: 24px;
}

.modal {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: modalIn 0.22s ease;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 0;
}

.modal-title {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 600;
  color: #1d1d1f;
}

.modal-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: #f2f2f7;
  color: #1d1d1f;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover {
  background: #e5e5ea;
}

/* 商品概要 */
.goods-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 18px 0;
  padding: 12px;
  background: #f7f7fa;
  border-radius: 12px;
}

.goods-img {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 8px;
  object-fit: cover;
  background: #ececf1;
}

.goods-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.goods-desc {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.goods-price {
  font-size: 16px;
  font-weight: 700;
  color: #e53935;
}

/* 弹窗正文（居中布局，与需求草图一致） */
.modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 24px 26px;
  text-align: center;
}

.modal-label {
  margin: 4px 0 10px;
  font-size: 14px;
  font-weight: 500;
  color: #515154;
}

.code-box {
  width: 100%;
  padding: 16px 12px;
  border: 1.5px dashed #c7c7cc;
  border-radius: 12px;
  background: #fafafc;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.code-box:hover {
  border-color: #0071e3;
  background: #f0f6ff;
}

.copy-btn {
  margin-top: 10px;
  padding: 6px 16px;
  border: 1px solid #0071e3;
  border-radius: 9999px;
  background: #ffffff;
  color: #0071e3;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.copy-btn:hover {
  background: #0071e3;
  color: #ffffff;
}

.code-text {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 6px;
  color: #0071e3;
}

.code-tip {
  font-size: 12px;
  color: #86868b;
}

.code-placeholder {
  font-size: 15px;
  font-weight: 500;
  color: #86868b;
}

.modal-divider {
  width: 100%;
  height: 1px;
  background: #e5e5ea;
  margin: 22px 0 18px;
}

.input-row {
  width: 100%;
  display: flex;
  gap: 10px;
}

.code-input {
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 14px;
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  font-size: 14px;
  color: #1d1d1f;
  background: #ffffff;
  outline: none;
  transition: border-color 0.2s ease;
}

.code-input:focus {
  border-color: #0071e3;
}

.code-input::placeholder {
  color: #a1a1a6;
}

.submit-btn {
  flex-shrink: 0;
  height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  background: #0071e3;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #0077ed;
}

.submit-btn:disabled {
  background: #a9c8f2;
  cursor: not-allowed;
}

.cancel-row {
  width: 100%;
  margin-top: 22px;
}

.cancel-btn {
  border: none;
  background: transparent;
  font-size: 14px;
  color: #d70015;
  cursor: pointer;
  padding: 4px;
}

.cancel-btn:hover {
  text-decoration: underline;
}
</style>
