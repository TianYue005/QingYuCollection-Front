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

    <!-- 商品详情 -->
    <template v-else>
      <!-- 左边的聊天界面 -->
      <div></div>
      <!-- 中间的商品信息界面 -->
      <div>
        <!-- 卖家信息 -->
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

        <!-- 商品图片 -->
        <div class="gallery">
          <el-carousel height="375px" motion-blur>
            <el-carousel-item v-for="url in carouselItems" :key="url">
              <img :src="url" alt="" class="gallery__image" @click="openPreview(url)" />
            </el-carousel-item>
          </el-carousel>
        </div>

        <!-- 商品详情 -->
        <div class="product-detail">
          <div class="product-detail__price-row">
            <span class="product-detail__price">&yen;{{ product?.price }}</span>
            <span class="product-detail__original-price">&yen;{{ product?.originalPrice }}</span>
          </div>

          <span class="product-detail__condition">{{ product?.productStatus }}</span>

          <p class="product-detail__desc">{{ product?.productDesc }}</p>

          <div class="product-detail__actions">
            <div class="product-detail__actions-row">
              <button
                class="btn-chat"
                :disabled="chatCreating"
                @click="handleChat"
              >{{ chatCreating ? '正在连接...' : '聊一聊' }}</button>
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
            <button
              class="btn-buy"
              :disabled="chatCreating"
              @click="handleBuy"
            >购买</button>
          </div>
        </div>
      </div>

      <!-- 商品评论区 -->
      <div class="comment-section">
        <h2 class="comment-section__title">评论</h2>

        <!-- 发表评论 -->
        <div class="comment-composer">
          <div class="comment-composer__rating">
            <button
              type="button"
              class="comment-composer__rate"
              :class="{ 'is-active': commentGoodOrBad }"
              @click="commentGoodOrBad = true"
            >
              好评
            </button>
            <button
              type="button"
              class="comment-composer__rate"
              :class="{ 'is-active': !commentGoodOrBad }"
              @click="commentGoodOrBad = false"
            >
              差评
            </button>
          </div>
          <textarea
            v-model="commentText"
            class="comment-composer__input"
            placeholder="写下你的评论..."
            maxlength="500"
          ></textarea>
          <button
            class="comment-composer__submit"
            :disabled="commentSubmitting"
            @click="submitComment"
          >
            {{ commentSubmitting ? '发布中...' : '发布' }}
          </button>
        </div>
        <p v-if="commentError" class="comment-section__error">{{ commentError }}</p>

        <!-- 加载状态 -->
        <div v-if="commentLoading" class="comment-section__status">加载中...</div>

        <!-- 空状态 -->
        <div v-else-if="comments.length === 0" class="comment-section__status">
          还没有评论，快来抢沙发~
        </div>

        <!-- 评论列表 -->
        <div v-else class="comment-list">
          <div v-for="c in comments" :key="c.id" class="comment-card">
            <div class="comment-card__head">
              <img
                v-if="c.userAvatar"
                :src="c.userAvatar"
                alt="头像"
                class="comment-card__avatar"
              />
              <span v-else class="comment-card__avatar comment-card__avatar--fallback">
                {{ avatarInitial(c.userName) }}
              </span>
              <div class="comment-card__meta">
                <span class="comment-card__name">{{ c.userName }}</span>
                <span class="comment-card__time">{{ formatTime(c.createTime) }}</span>
              </div>
            </div>

            <p v-if="c.parentId > 0" class="comment-card__reply-to">
              回复
              <span class="comment-card__reply-name">
                {{ c.replyUserName || ('用户 ' + c.replyUserId) }}
              </span>
            </p>

            <p class="comment-card__text">{{ c.text }}</p>

            <div v-if="splitPictures(c.picture).length" class="comment-card__pictures">
              <img
                v-for="pic in splitPictures(c.picture)"
                :key="pic"
                :src="pic"
                alt="评论图片"
                class="comment-card__pic"
              />
            </div>

            <div class="comment-card__actions">
              <button
                v-if="c.replyUserId || c.replyUserName"
                class="comment-card__view-replies"
                @click="openInteraction(c)"
              >
                查看该评论之前的互动
              </button>
              <button class="comment-card__reply" @click="openReply(c)">回复</button>
              <span v-if="c.son > 0" class="comment-card__son">{{ c.son }} 条回复</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 回复弹窗 -->
      <Teleport to="body">
        <Transition name="cc-dialog">
          <div v-if="showReply" class="cc-overlay" @click.self="closeReply">
            <div class="cc-dialog-card">
              <h3 class="cc-dialog-title">回复</h3>

              <p v-if="replyTarget" class="cc-reply-target">
                回复
                <span class="cc-reply-target-name">
                  {{ replyTarget.userName || ('用户 ' + replyTarget.userId) }}
                </span>
              </p>

              <textarea
                v-model="replyText"
                class="comment-composer__input"
                placeholder="写下你的回复..."
                maxlength="500"
              ></textarea>

              <p v-if="replyError" class="comment-section__error">{{ replyError }}</p>

              <div class="cc-dialog-actions">
                <button class="cc-btn-cancel" @click="closeReply">取消</button>
                <button class="cc-btn-submit" :disabled="replySubmitting" @click="submitReply">
                  {{ replySubmitting ? '回复中...' : '回复' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- 互动弹窗 -->
      <Teleport to="body">
        <Transition name="cc-dialog">
          <div v-if="showInteraction" class="cc-overlay" @click.self="closeInteraction">
            <div class="cc-dialog-card">
              <h3 class="cc-dialog-title">该评论之前的互动</h3>

              <div v-if="interactionLoading" class="comment-section__status">加载中...</div>
              <div v-else-if="interactionError" class="cc-interaction-error">
                {{ interactionError }}
              </div>
              <div v-else class="cc-interaction-list">
                <div v-for="m in interactionList" :key="m.id" class="cc-interaction-item">
                  <p v-if="m.replyUserId || m.replyUserName" class="comment-card__reply-to">
                    回复
                    <span class="comment-card__reply-name">
                      {{ m.replyUserName || ('用户 ' + m.replyUserId) }}
                    </span>
                  </p>
                  <p class="cc-interaction-text">{{ m.text }}</p>
                  <span class="cc-interaction-meta">
                    用户 {{ m.userId }} · {{ formatTime(m.createTime) }}
                  </span>
                </div>
              </div>

              <div class="cc-dialog-actions">
                <button class="cc-btn-cancel" @click="closeInteraction">关闭</button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

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
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import { ElCarousel, ElCarouselItem, ElMessage } from 'element-plus'
import { getItemById, addItemComment, selectItemComment, selectItemCommentInteraction, type GoodsVO, type CommentGoodsVO } from '@/api/item'
import { toggleFavorite as toggleFavoriteApi, removeFavorite, createChatSession } from '@/api/user'
import { DEFAULT_AVATAR, resolveAvatar } from '@/utils/avatar'
import { getUserId } from '@/composables/useAuth'
import { useChatStore } from '@/stores/chat'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const itemId: string = route.params.id as string

type SellerDetail = {
  // 雪花 id：后端 Jackson 把 Long 序列化为字符串，运行期可能是 string
  sellerId: number | string
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

const toggleFavorite = async () => {
  try {
    const res = isFavorited.value
      ? await removeFavorite(itemId)
      : await toggleFavoriteApi(itemId)
    if (res.code === 1) {
      isFavorited.value = !isFavorited.value
    }
  } catch (error) {
    console.error('收藏操作失败:', error)
  }
}

/**
 * 点击"聊一聊"/"购买"共用逻辑：先调用后端发起会话拿到 sessionId，
 * 再带着会话 id、卖家信息与入口标记跳转到聊天详情页。
 * 入口不同，聊天页行为不同：
 * - 'item'：from=item，聊天页做"会话商品联想"，用户可手动"点击发送"商品卡片或发起交易请求；
 * - 'buy' ：from=buy&goodsId=xxx，聊天页打开后自动向卖家发送一条交易请求消息（msgType=4）。
 */
const chatCreating = ref(false)

async function startChat(entry: 'item' | 'buy') {
  const sellerId = sellerDetail.value?.sellerId
  if (sellerId == null || sellerId === '') return
  // 不能和自己交易/聊天
  if (String(sellerId) === String(getUserId())) {
    ElMessage.warning(entry === 'buy' ? '不能购买自己发布的商品' : '不能和自己聊天')
    return
  }
  if (chatCreating.value) return
  chatCreating.value = true
  try {
    // 发起会话接口返回裸 sessionId 字符串，不包 Result
    const sessionId = await createChatSession(sellerId, itemId)
    if (sessionId == null || sessionId === '') {
      ElMessage.error('发起会话失败，请稍后重试')
      return
    }
    // 乐观更新：把本次发起的会话写入 store，聊天页会话列表加载后自动插入，
    // 避免"未聊过"的新会话在后端列表里缺失（无缝开聊）
    chatStore.setPendingChat({
      sessionId,
      toUid: sellerId,
      name: sellerDetail.value?.sellerName || '未知用户',
      icon: sellerDetail.value?.sellerAvatar,
    })
    // 兜底：MessageView 无 toUid query 时回退到 Pinia 里的卖家 id
    chatStore.setChatPartnerID(sellerId)
    const query: Record<string, string> = {
      toUid: String(sellerId),
      name: sellerDetail.value?.sellerName || '未知用户',
      from: entry,
    }
    if (entry === 'buy') query.goodsId = String(itemId)
    router.push({
      name: 'chatDetail',
      params: { chatId: String(sessionId) },
      query,
    })
  } catch (error) {
    console.error('发起会话失败:', error)
    ElMessage.error('发起会话失败，请稍后重试')
  } finally {
    chatCreating.value = false
  }
}

/** 点击"聊一聊"：进入聊天并做会话商品联想 */
const handleChat = () => startChat('item')

/** 点击"购买"：进入聊天并自动向卖家发送交易请求 */
const handleBuy = () => startChat('buy')

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
      isFavorited.value = !!item.favourite
      product.value = {
        productDesc: item.goodsDesc || '',
        price: item.price ?? 0,
        originalPrice: item.originalPrice ?? 0,
        productStatus: item.tags?.split(',')[0] ?? '',
      }
      carouselItems.value = item.imgList?.map((img) => img.imgUrl) ?? []
      sellerDetail.value = {
        sellerId: item.userId ?? 0,
        sellerAvatar: DEFAULT_AVATAR,
        sellerName: item.userName || '匿名用户',
        overTime: 0,
        sellerRegisterTime: 0,
        sellerSellCount: 0,
        sellerGoodRate: 0,
      }
    } else {
      notFound.value = true
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

// ==================== 商品评论 ====================
const comments = ref<CommentGoodsVO[]>([])
const commentLoading = ref(false)
const commentError = ref('')

/** 读取缓存的用户信息，用于补全评论人信息 */
const readCachedUserInfo = () => {
  try {
    const cached = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

const currentUserId = readCachedUserInfo()?.userId ?? getUserId()

/** 请求商品评论列表 */
const fetchComments = async () => {
  commentLoading.value = true
  commentError.value = ''
  try {
    const res = await selectItemComment(Number(itemId))
    if (res.code === 1 && res.data) {
      comments.value = (res.data.rows || []).map((c) => ({
        ...c,
        userAvatar: resolveAvatar(c.userAvatar),
      }))
    } else {
      commentError.value = res.msg || '获取评论失败'
    }
  } catch {
    commentError.value = '评论加载失败，请稍后重试'
  } finally {
    commentLoading.value = false
  }
}

/** 当前时间 yyyy-MM-dd HH:mm:ss（与后端 CommentItem.createTime 格式对齐） */
const formatNow = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 发表评论 */
const commentText = ref('')
const commentSubmitting = ref(false)
/** 好评(true)/差评(false)，默认好评 */
const commentGoodOrBad = ref(true)

const submitComment = async () => {
  const text = commentText.value.trim()
  if (!text) {
    commentError.value = '请输入评论内容'
    return
  }
  if (!currentUserId) {
    commentError.value = '请先登录后再评论'
    return
  }
  commentSubmitting.value = true
  commentError.value = ''
  try {
    const res = await addItemComment({
      goodsId: Number(itemId),
      parentId: 0,
      text,
      picture: '',
      son: 0,
      createTime: formatNow(),
      goodOrBad: commentGoodOrBad.value,
      userId: currentUserId,
      replyUserId: null,
    })
    if (res.code === 1) {
      commentText.value = ''
      await fetchComments()
    } else {
      commentError.value = res.msg || '评论失败'
    }
  } catch {
    commentError.value = '评论失败，请稍后重试'
  } finally {
    commentSubmitting.value = false
  }
}

/** 回复评论 */
const showReply = ref(false)
const replyTarget = ref<CommentGoodsVO | null>(null)
const replyText = ref('')
const replySubmitting = ref(false)
const replyError = ref('')

const openReply = (comment: CommentGoodsVO) => {
  replyTarget.value = comment
  replyText.value = ''
  replyError.value = ''
  showReply.value = true
}

const closeReply = () => {
  showReply.value = false
}

const submitReply = async () => {
  const text = replyText.value.trim()
  if (!text) {
    replyError.value = '请输入回复内容'
    return
  }
  if (!replyTarget.value) return
  if (!currentUserId) {
    replyError.value = '请先登录后再回复'
    return
  }
  replySubmitting.value = true
  replyError.value = ''
  try {
    const res = await addItemComment({
      goodsId: Number(itemId),
      parentId: replyTarget.value.id,
      text,
      picture: '',
      son: 0,
      createTime: formatNow(),
      userId: currentUserId,
      replyUserId: replyTarget.value.userId,
    })
    if (res.code === 1) {
      replyText.value = ''
      showReply.value = false
      await fetchComments()
    } else {
      replyError.value = res.msg || '回复失败'
    }
  } catch {
    replyError.value = '回复失败，请稍后重试'
  } finally {
    replySubmitting.value = false
  }
}

/** 查看该评论之前的所有互动 */
const showInteraction = ref(false)
const interactionLoading = ref(false)
const interactionError = ref('')
const interactionList = ref<CommentGoodsVO[]>([])

const openInteraction = async (comment: CommentGoodsVO) => {
  showInteraction.value = true
  interactionLoading.value = true
  interactionError.value = ''
  interactionList.value = []
  try {
    const res = await selectItemCommentInteraction(comment.id)
    if (res.code === 1 && res.data) {
      interactionList.value = res.data.rows || []
    } else {
      interactionError.value = res.msg || '获取互动失败'
    }
  } catch {
    interactionError.value = '获取互动失败，请稍后重试'
  } finally {
    interactionLoading.value = false
  }
}

const closeInteraction = () => {
  showInteraction.value = false
}

/** 评论图片可能是逗号分隔的多张 */
const splitPictures = (picture: string) => {
  return picture ? picture.split(',').filter(Boolean) : []
}

/** 用户名首字母（无头像时兜底） */
const avatarInitial = (name: string) => (name || '?').charAt(0).toUpperCase()

/** 将后端时间（可能是 2026-08-14T01:38:40）格式化为易读的 yyyy-MM-dd HH:mm */
const formatTime = (time?: string) => {
  if (!time) return ''
  return time.replace('T', ' ').slice(0, 16)
}

onMounted(() => {
  fetchItem()
  fetchComments()
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

.btn-chat:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* ==================== 商品评论区 ==================== */

.comment-section {
  margin-top: 24px;
  background: #ffffff;
  border-radius: 18px;
  padding: 24px 20px;
}

.comment-section__title {
  margin: 0 0 20px;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: #1d1d1f;
}

.comment-section__error {
  margin: 0 0 12px;
  font-size: 14px;
  color: #ff3b30;
}

.comment-section__status {
  padding: 36px 0;
  text-align: center;
  font-size: 15px;
  color: #7a7a7a;
}

/* 发表评论 */
.comment-composer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

/* 好评/差评切换 */
.comment-composer__rating {
  display: inline-flex;
  align-self: flex-start;
  gap: 0;
  background: #f5f5f7;
  border-radius: 9999px;
  padding: 3px;
}

.comment-composer__rate {
  height: 30px;
  padding: 0 16px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #7a7a7a;
  background: transparent;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.comment-composer__rate.is-active {
  color: #ffffff;
  background: #0066cc;
}

.comment-composer__input {
  width: 100%;
  min-height: 88px;
  padding: 12px 14px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  line-height: 1.47;
  color: #1d1d1f;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.comment-composer__input:focus {
  border-color: #0066cc;
}

.comment-composer__input::placeholder {
  color: #7a7a7a;
}

.comment-composer__submit {
  align-self: flex-end;
  height: 36px;
  padding: 0 20px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  background: #0066cc;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
}

.comment-composer__submit:hover {
  background: #0071e3;
}

.comment-composer__submit:active {
  transform: scale(0.95);
}

.comment-composer__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 评论列表 */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-card {
  padding: 16px;
  background: #f5f5f7;
  border-radius: 14px;
}

.comment-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.comment-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: #e8e8ed;
}

.comment-card__avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: #0066cc;
  font-size: 15px;
  font-weight: 600;
}

.comment-card__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.comment-card__name {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
}

.comment-card__time {
  font-size: 12px;
  color: #7a7a7a;
}

.comment-card__reply-to {
  margin: 0 0 6px;
  font-size: 13px;
  color: #7a7a7a;
}

.comment-card__reply-name {
  color: #0066cc;
  font-weight: 500;
}

.comment-card__text {
  margin: 0 0 10px;
  font-size: 15px;
  line-height: 1.5;
  color: #1d1d1f;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-card__pictures {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.comment-card__pic {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}

.comment-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.comment-card__view-replies,
.comment-card__reply {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 14px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
}

.comment-card__view-replies {
  color: #0066cc;
  background: rgba(0, 102, 204, 0.08);
}

.comment-card__view-replies:hover {
  background: rgba(0, 102, 204, 0.14);
}

.comment-card__reply {
  color: #7a7a7a;
  background: #ffffff;
}

.comment-card__reply:hover {
  background: #ececee;
}

.comment-card__son {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  color: #7a7a7a;
  background: #ffffff;
  border-radius: 9999px;
  user-select: none;
}

/* ==================== 弹窗 ==================== */

.cc-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.cc-dialog-card {
  width: 100%;
  max-width: 420px;
  margin: 24px;
  background: #ffffff;
  border-radius: 20px;
  padding: 24px 22px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  max-height: 80vh;
  overflow-y: auto;
}

.cc-dialog-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  color: #1d1d1f;
}

.cc-reply-target {
  margin: 0 0 10px;
  font-size: 14px;
  color: #7a7a7a;
}

.cc-reply-target-name {
  color: #0066cc;
  font-weight: 500;
}

.cc-dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.cc-btn-cancel,
.cc-btn-submit {
  flex: 1;
  height: 42px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 500;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
}

.cc-btn-cancel {
  color: #0066cc;
  background: transparent;
  border: 1px solid #0066cc;
}

.cc-btn-cancel:hover {
  background: rgba(0, 102, 204, 0.08);
}

.cc-btn-submit {
  color: #ffffff;
  background: #0066cc;
  border: 1px solid #0066cc;
}

.cc-btn-submit:hover {
  background: #0071e3;
  border-color: #0071e3;
}

.cc-btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cc-interaction-error {
  padding: 20px 0;
  text-align: center;
  font-size: 14px;
  color: #ff3b30;
}

.cc-interaction-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 50vh;
  overflow-y: auto;
}

.cc-interaction-item {
  padding: 12px 14px;
  background: #f5f5f7;
  border-radius: 12px;
}

.cc-interaction-text {
  margin: 0 0 4px;
  font-size: 15px;
  line-height: 1.5;
  color: #1d1d1f;
  white-space: pre-wrap;
  word-break: break-word;
}

.cc-interaction-meta {
  font-size: 12px;
  color: #7a7a7a;
}

/* 弹窗过渡 */
.cc-dialog-enter-active,
.cc-dialog-leave-active {
  transition: opacity 0.25s ease;
}

.cc-dialog-enter-active .cc-dialog-card,
.cc-dialog-leave-active .cc-dialog-card {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.cc-dialog-enter-from,
.cc-dialog-leave-to {
  opacity: 0;
}

.cc-dialog-enter-from .cc-dialog-card,
.cc-dialog-leave-to .cc-dialog-card {
  transform: scale(0.95);
  opacity: 0;
}
</style>
