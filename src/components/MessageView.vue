<template>
  <div v-if="!chatId && toUid == null" class="message-placeholder">
    <div class="placeholder-content">
      <div class="logo-wrapper">
        <img src="@/assets/picture/logo.svg" alt="" />
      </div>
      <h1 class="placeholder-title">未选择任何联系人</h1>
      <p class="placeholder-subtitle">点击左侧列表开聊吧</p>
    </div>
  </div>

  <div v-else class="message-container">
    <div class="message-header">
      <span class="header-name">{{ peerName }}</span>
    </div>

    <div ref="messageListRef" class="message-content" @scroll="handleScroll">
      <div v-if="loadingOlder" class="history-loading">加载中…</div>
      <div v-else-if="!hasMore && messages.length > 0" class="history-loading">没有更多消息了</div>
      <div
        v-for="item in renderMessages"
        :key="item.msg.id || item.msg.sendTime + item.msg.content"
        class="message-bubble-wrapper"
        :class="{ 'message-self': isSelf(item.msg) }"
      >
        <!-- 商品卡片消息（msgType=3，content 为商品 id）：用简略信息接口数据渲染 -->
        <div v-if="item.msg.msgType === 3" class="message-goods">
          <div
            v-if="item.loaded && item.goods"
            class="goods-msg-card"
            title="查看商品详情"
            @click="goGoodsDetail(item.goods.goodsId)"
          >
            <img
              v-if="item.goods?.imgUrl"
              class="goods-msg-img"
              :src="item.goods.imgUrl"
              alt="商品图片"
            />
            <div class="goods-msg-info">
              <div class="goods-msg-desc">{{ item.goods.goodsDesc }}</div>
              <div class="goods-msg-price">¥{{ Number(item.goods.price ?? 0).toFixed(2) }}</div>
            </div>
          </div>
          <div v-else class="goods-msg-state">
            {{ item.loaded ? '商品已失效或不存在' : '商品加载中…' }}
          </div>
          <div class="goods-msg-time">{{ formatTime(item.msg.sendTime) }}</div>
        </div>
        <!-- 交易请求消息（msgType=4，content 为商品 id）：用 /websocket/tradeRequest/tradeState 查询的商品信息与交易状态渲染；收到待处理的请求可接受/拒绝 -->
        <div v-else-if="item.msg.msgType === 4" class="message-trade">
          <div
            v-if="item.tradeLoaded && item.trade"
            class="trade-msg-card"
            title="查看商品详情"
            @click="goGoodsDetail(item.trade.goodsId)"
          >
            <img
              v-if="item.trade.imgUrl"
              class="trade-msg-img"
              :src="item.trade.imgUrl"
              alt="商品图片"
            />
            <div class="trade-msg-info">
              <div class="trade-msg-desc">{{ item.trade.goodsDesc }}</div>
              <div class="trade-msg-price">¥{{ Number(item.trade.price ?? 0).toFixed(2) }}</div>
            </div>
            <span
              class="trade-msg-state"
              :class="tradeStateClass(item.trade.tradeState)"
            >{{ tradeStateText(item.trade.tradeState, isSelf(item.msg)) }}</span>
          </div>
          <div v-else class="trade-msg-placeholder">
            {{ item.tradeLoaded ? (isSelf(item.msg) ? '等待对方处理' : '交易状态获取失败，请稍后重试') : '交易状态加载中…' }}
          </div>
          <!-- 只有"收到对方的交易请求且状态仍待处理（未确认 0 / 已有请求 1）"时展示接受/拒绝；已同意(2)/已拒绝(3)/已完成(4)不再显示按钮 -->
          <div
            v-if="item.trade && (item.trade.tradeState === 0 || item.trade.tradeState === 1) && !isSelf(item.msg)"
            class="trade-msg-actions"
          >
            <button
              class="trade-msg-btn trade-msg-btn-accept"
              :disabled="actingTradeKey === tradeKeyOf(item.msg)"
              @click.stop="handleTradeAction(item.msg, 2)"
            >接受</button>
            <button
              class="trade-msg-btn trade-msg-btn-reject"
              :disabled="actingTradeKey === tradeKeyOf(item.msg)"
              @click.stop="handleTradeAction(item.msg, 3)"
            >拒绝</button>
          </div>
          <div class="trade-msg-time">{{ formatTime(item.msg.sendTime) }}</div>
        </div>
        <!-- 文本 / 链接消息 -->
        <div v-else class="message-bubble">
          <div class="bubble-text">
            <!-- 链接消息（msgType=2）渲染为可点击链接 -->
            <a
              v-if="item.msg.msgType === 2"
              :href="item.msg.content"
              target="_blank"
              rel="noopener noreferrer"
              class="bubble-link"
            >{{ item.msg.content }}</a>
            <template v-else>{{ item.msg.content }}</template>
          </div>
          <div class="bubble-time">{{ formatTime(item.msg.sendTime) }}</div>
        </div>
      </div>
    </div>

    <!-- 会话商品联想卡片：从商品详情页"聊一聊"进入时展示，整卡点击"点击发送"以商品卡片消息（msgType=3）发出；"发起交易请求"发送交易请求消息（msgType=4）；可点"×"关闭，5 秒后自动消失 -->
    <div v-if="lenovoGoods" class="lenovo-card" @click="handleLenovoClick">
      <img v-if="lenovoCover" class="lenovo-card-img" :src="lenovoCover" alt="商品图片" />
      <div class="lenovo-card-info">
        <div class="lenovo-card-desc">{{ lenovoGoods.goodsDesc }}</div>
        <div class="lenovo-card-price">¥{{ Number(lenovoGoods.price).toFixed(2) }}</div>
      </div>
      <div class="lenovo-card-actions">
        <button
          class="lenovo-card-trade"
          @click.stop="handleLenovoTrade"
        >发起交易请求</button>
        <span class="lenovo-card-send">点击发送</span>
      </div>
      <button class="lenovo-card-close" aria-label="关闭联想提示" title="关闭" @click.stop="dismissLenovo">×</button>
    </div>

    <div class="input-container">
      <input
        v-model="inputText"
        type="text"
        placeholder="请输入消息"
        @keyup.enter="handleSend"
      />
      <button :disabled="!inputText.trim()" @click="handleSend">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMessageHistory, createChatSession, tradeRequestLenovo, selectTradeState, handleTradeRequest } from '@/api/user'
import { selectBriefInfo } from '@/api/item'
import { useStomp } from '@/composables/useStomp'
import { getUserId } from '@/composables/useAuth'
import { useChatStore } from '@/stores/chat'
import type { ChatMessage } from '@/types/chat'
import type { ChatListVO, UserAccountInfo, ProductAssociationVO } from '@/api/user'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const { connected, sendPrivateMessage, onMessage } = useStomp()

const chatId = computed<number | string | null>(() => {
  const id = route.params.chatId
  // 后端 Jackson 把 Long（雪花 id）序列化为字符串，直接透传避免 Number() 丢失精度
  return id ? String(id) : null
})

/**
 * 私聊对象 uid。
 * 雪花 id 必须保持字符串（后端 Jackson 把 Long 序列化成字符串），
 * 不能 Number() 强转，否则超出 JS 安全整数范围会丢精度。
 */
const toUid = computed<string | null>(() => {
  const uid = route.query.toUid
  if (uid) return String(uid)
  // 从"聊一聊"进入时无 toUid query，回退到 Pinia 里存的卖家 id
  const partnerId = chatStore.ChatPartnerID
  return partnerId != null ? String(partnerId) : null
})

/** 读取缓存的用户信息（NavBanner 每次进页面通过 accountInfo 接口请求后写入本地存储） */
function readCachedUserInfo(): UserAccountInfo | null {
  try {
    const cached = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
    return cached ? (JSON.parse(cached) as UserAccountInfo) : null
  } catch {
    return null
  }
}

/**
 * 当前登录用户 uid（统一转成字符串，避免雪花 id 精度丢失）。
 * 优先取本地缓存的 userInfo.userId（accountInfo 接口每次访问页面都会请求并写入本地），
 * 无缓存时兜底从 JWT 解码；判断消息归属时统一用 String 与 fromUid 比较。
 */
const cachedUid = readCachedUserInfo()?.userId
const jwtUid = getUserId()
const myUid = ref<string | null>(
  cachedUid != null ? String(cachedUid) : jwtUid != null ? String(jwtUid) : null,
)
const peerName = ref(typeof route.query.name === 'string' ? route.query.name : '')
const inputText = ref('')
const messages = ref<ChatMessage[]>([])
const messageListRef = ref<HTMLElement | null>(null)
/** 当前会话 id（发消息时必须带上，否则后端会话 id 错乱） */
const sessionId = ref<string | null>(null)

/**
 * 是否从商品详情页"聊一聊"进入（路由带 from=item 标记）：
 * 只有该入口才做"会话商品联想"，其他入口（如会话列表点开）不请求，为后续非商品入口留有余地。
 */
const fromItemPage = computed(() => route.query.from === 'item')
/** 会话商品联想返回的商品简略信息；后端返回 null 表示该会话无需联想，数据暂存供渲染"待发送"联想卡片 */
const lenovoGoods = ref<ProductAssociationVO | null>(null)

/** 联想商品图片 URL：无图时为空字符串，模板据此决定是否渲染 img（避免模板内对 null 收窄报错） */
const lenovoCover = computed(() => lenovoGoods.value?.imgUrl ?? '')

/** 商品卡片消息的简略信息缓存：key = 商品 id（msgType=3 时 content 就是商品 id） */
const goodsBriefMap = reactive<Record<string, ProductAssociationVO | null>>({})
/** 正在请求简略信息的商品 id（避免同一商品并发重复请求） */
const loadingBriefKeys = new Set<string>()

/** 拉取商品简略信息并缓存；请求失败或商品已失效时也写入 null，避免卡片一直显示"加载中" */
async function fetchGoodsBrief(goodsId: number | string) {
  const key = String(goodsId)
  if (key in goodsBriefMap || loadingBriefKeys.has(key)) return
  loadingBriefKeys.add(key)
  try {
    const brief = await selectBriefInfo(key)
    goodsBriefMap[key] = brief ?? null
  } catch (error) {
    console.error('获取商品简略信息失败:', error)
    goodsBriefMap[key] = null
  } finally {
    loadingBriefKeys.delete(key)
  }
}

/**
 * 交易请求消息缓存：key = `${sessionId}:${goodsId}`。
 * 同一商品在不同会话/不同角色下的交易状态不同，因此 key 必须带会话 id（不能只按商品 id 缓存）。
 */
const tradeMap = reactive<Record<string, ProductAssociationVO | null>>({})
/** 正在请求交易状态的 key（避免并发重复请求） */
const loadingTradeKeys = new Set<string>()

/** 交易状态缓存 key：前缀当前会话 id */
function tradeCacheKey(goodsId: number | string): string {
  return `${sessionId.value ?? ''}:${goodsId}`
}

/** 从消息里取交易商品 id：优先用专用字段 goodsId，历史消息/老推送没有该字段时回退到 content */
function tradeGoodsIdOf(msg: ChatMessage): string {
  return msg.goodsId != null && msg.goodsId !== '' ? String(msg.goodsId) : String(msg.content)
}

/** 交易卡片的 key（模板里按钮 disabled / 防重复提交判断用） */
function tradeKeyOf(msg: ChatMessage): string {
  return tradeCacheKey(tradeGoodsIdOf(msg))
}

/**
 * 拉取交易信息与交易状态并缓存。
 * force=true 时忽略已有缓存强制刷新（接受/拒绝成功、收到新消息、重开会话时使用）；
 * 刷新期间保留旧值展示，避免卡片闪烁。
 */
async function fetchTradeState(goodsId: number | string, force = false) {
  const sid = sessionId.value
  if (sid == null) return
  const key = `${sid}:${goodsId}`
  if (loadingTradeKeys.has(key)) return
  if (!force && key in tradeMap) return
  loadingTradeKeys.add(key)
  try {
    const trade = await selectTradeState(sid, goodsId)
    tradeMap[key] = trade ?? null
    if (trade == null && !force) {
      // 刚发出请求时交易记录可能尚未落库，稍等片刻强制重试一次，避免卡片误显"暂无"
      setTimeout(() => {
        if (sessionId.value !== sid) return
        fetchTradeState(goodsId, true)
      }, 800)
    }
  } catch (error) {
    console.error('获取交易状态失败:', error)
    // 无旧值时写入 null，避免卡片一直显示"加载中"
    if (!(key in tradeMap)) tradeMap[key] = null
  } finally {
    loadingTradeKeys.delete(key)
  }
}

/** 清空某会话的交易状态缓存（重开历史时调用，强制下次重新拉取最新状态） */
function clearSessionTradeCache(sid: number | string) {
  const prefix = `${String(sid)}:`
  Object.keys(tradeMap).forEach((k) => {
    if (k.startsWith(prefix)) delete tradeMap[k]
  })
}

/** 强制刷新当前会话里所有交易请求卡片的交易状态 */
async function refreshVisibleTradeStates() {
  const sid = sessionId.value
  if (!sid) return
  const goodsIds = new Set<string>()
  messages.value.forEach((m) => {
    if (m.msgType === 4 && (m.goodsId || m.content)) goodsIds.add(tradeGoodsIdOf(m))
  })
  await Promise.all([...goodsIds].map((gid) => fetchTradeState(gid, true)))
}

/** 扫描消息列表：为商品卡片（msgType=3）拉简略信息、为交易请求（msgType=4）拉交易信息与状态（缓存命中则跳过） */
watch(
  messages,
  (list) => {
    list.forEach((msg) => {
      if (msg.msgType === 3 && msg.content) fetchGoodsBrief(msg.content)
      else if (msg.msgType === 4 && (msg.goodsId || msg.content)) fetchTradeState(tradeGoodsIdOf(msg))
    })
  },
  { deep: true },
)

/** 渲染条目的统一结构：msgType=3 用 goods/loaded，msgType=4 用 trade/tradeLoaded */
interface RenderEntry {
  msg: ChatMessage
  goods: ProductAssociationVO | null
  loaded: boolean
  trade: ProductAssociationVO | null
  tradeLoaded: boolean
}

/**
 * 消息渲染视图：给商品卡片消息（msgType=3）附带已加载的简略信息，
 * 给交易请求消息（msgType=4）附带已加载的交易信息与状态。
 * loaded / tradeLoaded = false 表示尚未请求完成（显示加载中）。
 */
const renderMessages = computed<RenderEntry[]>(() =>
  messages.value.map((msg) => {
    if (msg.msgType === 3) {
      const key = String(msg.content)
      return {
        msg,
        goods: goodsBriefMap[key] ?? null,
        loaded: key in goodsBriefMap,
        trade: null,
        tradeLoaded: false,
      }
    }
    if (msg.msgType === 4) {
      const key = tradeCacheKey(tradeGoodsIdOf(msg))
      return {
        msg,
        goods: null,
        loaded: false,
        trade: tradeMap[key] ?? null,
        tradeLoaded: key in tradeMap,
      }
    }
    return { msg, goods: null, loaded: false, trade: null, tradeLoaded: false }
  }),
)

/** 历史消息分页：聊天接口每页固定 20 条（与后端约定，与其他分页接口区分） */
const PAGE_SIZE = 20
const pageNumber = ref(1)
const hasMore = ref(true)
const loadingOlder = ref(false)

let removeMessageHandler: (() => void) | null = null

function formatTime(time?: string) {
  if (!time) return ''
  // 兼容两种格式：Jackson ISO "yyyy-MM-ddTHH:mm:ss"（WS 推送）与 MySQL "yyyy-MM-dd HH:mm:ss(.S)"（历史接口）
  const date = new Date(time.includes('T') ? time : time.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return ''
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function scrollToBottom() {
  nextTick(() => {
    const el = messageListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

/**
 * 判断消息是否是自己发的：发送方 id（fromUid）等于当前登录用户 uid 即为自己发的，
 * 否则认为是对方发来的（后端 Jackson 把 Long 序列化成字符串，统一转 String 比较，避免精度丢失）。
 */
function isSelf(msg: ChatMessage) {
  return msg.fromUid != null && myUid.value != null && String(msg.fromUid) === myUid.value
}

/** 兜底发起会话：路由没带 sessionId 时（如从其他入口进入）先创建会话拿 sessionId */
async function ensureSessionId(): Promise<string | null> {
  if (sessionId.value) return sessionId.value
  if (toUid.value == null) return null
  try {
    // 发起会话接口返回裸 sessionId 字符串，不包 Result；goodsId 传 0 表示不谈论具体商品
    const res = await createChatSession(toUid.value, 0)
    if (res == null) return null
    const sid = String(res)
    sessionId.value = sid
    return sid
  } catch (error) {
    console.error('发起会话失败:', error)
    return null
  }
}

/**
 * 发送私聊消息（文本 / 商品卡片共用）：
 * 检查连接 → 补 sessionId → 本地立即渲染（后端不回传发送者）→ 同步左侧会话列表 → WS 发送
 * @returns 是否发送成功
 */
async function sendMessage(wireMsg: ChatMessage): Promise<boolean> {
  const uid = toUid.value
  if (uid == null) return false

  // 每次发送前检查 WebSocket 连接状态，未连接则提示并中止发送
  if (!connected.value) {
    alert('正在连接服务器，请稍后再试')
    return false
  }

  // 发消息前必须先拿到 sessionId 并带上，否则后端会话 id 错乱
  const sid = await ensureSessionId()
  if (!sid) return false
  wireMsg.sessionId = sid
  wireMsg.toUid = uid // 字符串传，避免雪花 id 丢精度

  // 后端会自动填 fromUid / id / sendTime / isRead，这里只传必须字段；
  // type 必须传 0：后端 if (getType() == 0) 才发送，不传会 null 拆箱抛异常
  const rendered: ChatMessage = {
    ...wireMsg,
    fromUid: myUid.value ?? 0,
    sendTime: new Date().toISOString(),
  }
  // 私聊后端不会把消息回传给发送者，这里本地立即渲染自己的消息
  messages.value.push(rendered)
  scrollToBottom()

  // 同步左侧会话列表的最后一条消息（后端不回传发送者，需自己推送）
  chatStore.setSentMessage(rendered)

  sendPrivateMessage(wireMsg)
  return true
}

/**
 * 按消息类型发送一条消息（文本=1 / 商品卡片=3 / 交易请求=4 共用 handleSend 的发送链路）
 * @param goodsId 交易请求（msgType=4）专用：通过 ChatMessage.goodsId 字段携带请求交易的商品 id
 */
async function sendChat(msgType: number, content: string, goodsId?: number | string): Promise<boolean> {
  return sendMessage({
    sessionId: sessionId.value ?? '',
    toUid: toUid.value ?? '',
    groupId: 0, // 私聊必须显式传 0，否则后端 saveToRedis 里 null 拆箱会抛 NPE
    content,
    msgType,
    type: 0, // 0 = 正常聊天
    goodsId,
  })
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  const ok = await sendChat(1, text) // 1 = 纯文本
  if (ok) inputText.value = ''
}

/** 兼容两种格式：Jackson ISO "yyyy-MM-ddTHH:mm:ss"（WS 推送）与 MySQL "yyyy-MM-dd HH:mm:ss(.S)"（历史接口） */
function parseTime(time?: string): number {
  if (!time) return 0
  const date = new Date(time.includes('T') ? time : time.replace(' ', 'T'))
  return date.getTime() || 0
}

/** 将后端历史 VO 行转成前端消息模型（保留 msgType 以便渲染链接消息） */
function mapRows(rows: ChatListVO[]): ChatMessage[] {
  return rows.map((item) => ({
    id: item.id,
    sessionId: item.sessionId,
    fromUid: item.fromUid,
    toUid: item.toUid,
    content: item.content,
    msgType: item.msgType,
    sendTime: item.sendTime,
    nickName: item.userName,
    avatar: item.avatar,
  }))
}

/** 首次加载：取第 1 页（固定 20 条） */
async function loadHistory(sid: number | string) {
  pageNumber.value = 1
  hasMore.value = true
  messages.value = []
  // 重开历史时清掉该会话的交易状态缓存，保证交易卡片总是拉取最新状态（对方可能已接受/拒绝）
  clearSessionTradeCache(sid)
  try {
    const res = await getMessageHistory(sid, 1)
    if (res.code === 1 && res.data) {
      const rows = res.data.rows || []
      // 历史接口返回顺序不保证，按 sendTime 升序排列，保证最新消息在底部
      messages.value = mapRows(rows).sort((a, b) => parseTime(a.sendTime) - parseTime(b.sendTime))
      if (rows.length < PAGE_SIZE) hasMore.value = false
      if (rows.length > 0 && rows[0]?.userName) {
        // 优先用会话列表带过来的对方用户名（route.query.name），历史记录里有 userName 才覆盖
        peerName.value = rows[0].userName
      }
      scrollToBottom()
    }
  } catch (error) {
    console.error('加载历史消息失败:', error)
  }
}

/** 联想卡片自动消失的定时器（5 秒后自动隐藏，未点击"点击发送"则不发送） */
let lenovoHideTimer: ReturnType<typeof setTimeout> | null = null

function clearLenovoHideTimer() {
  if (lenovoHideTimer) {
    clearTimeout(lenovoHideTimer)
    lenovoHideTimer = null
  }
}

/** 联想卡片 5 秒后自动消失 */
function scheduleLenovoHide() {
  clearLenovoHideTimer()
  lenovoHideTimer = setTimeout(() => {
    lenovoHideTimer = null
    lenovoGoods.value = null
  }, 5000)
}

/** 点击联想卡片的"×"手动关闭 */
function dismissLenovo() {
  clearLenovoHideTimer()
  lenovoGoods.value = null
}

/**
 * 会话商品联想：进入聊天界面时立马请求关联商品简略信息。
 * 仅从商品详情页"聊一聊"进入（from=item）才请求；后端返回 null 表示无需联想。
 * 联想卡片展示后 5 秒自动消失，也可点击"×"手动关闭。
 */
async function fetchLenovoGoods() {
  const sid = sessionId.value
  // 非商品页入口不联想（留有余地），切换会话时同时清掉上一会话的联想卡片与定时器
  if (!fromItemPage.value || !sid) {
    clearLenovoHideTimer()
    lenovoGoods.value = null
    return
  }
  try {
    const goods = await tradeRequestLenovo(sid)
    lenovoGoods.value = goods
    if (goods) {
      scheduleLenovoHide()
    } else {
      clearLenovoHideTimer()
    }
  } catch (error) {
    console.error('会话商品联想失败:', error)
    clearLenovoHideTimer()
    lenovoGoods.value = null
  }
}

/**
 * 点击联想卡片"点击发送"：把该商品作为商品卡片消息发给对方（msgType=3，content 传商品 id）。
 * 对方收到后根据 msgType=3 用 /items/select/briefInfo 查简略信息展示。
 */
async function handleLenovoClick() {
  const goods = lenovoGoods.value
  if (!goods) return
  // 本地已有关联数据，先写入简略信息缓存，发送后卡片立即渲染，无需再请求一次接口
  goodsBriefMap[String(goods.goodsId)] = goods
  const ok = await sendChat(3, String(goods.goodsId)) // 3 = 商品卡片
  if (ok) {
    // 发送成功：卡片作为消息进入会话，隐藏上方的"待发送"联想条并取消自动消失定时器
    clearLenovoHideTimer()
    lenovoGoods.value = null
  }
}

/**
 * 联想卡片"发起交易请求"：把该商品作为交易请求消息发给对方。
 * 交易请求消息 msgType=4，content 里存商品的 goods_id；
 * 对方收到后根据 msgType=4 调 /websocket/tradeRequest/tradeState/{sessionId}/{goodsId}
 * 查询商品信息与交易状态，并对"已有请求"的交易卡片做接受/拒绝。
 */
async function handleLenovoTrade() {
  const goods = lenovoGoods.value
  if (!goods) return
  // 交易请求消息 msgType=4：content 冗余存商品 id，goodsId 字段专门携带请求交易的商品 id
  const ok = await sendChat(4, String(goods.goodsId), goods.goodsId)
  if (ok) {
    // 交易请求作为消息进入会话，隐藏联想条
    clearLenovoHideTimer()
    lenovoGoods.value = null
  }
}

/**
 * 交易状态文案：0 未确认 / 1 已有请求 = 待处理（自己发出的显示"等待对方处理"，
 * 对方发来的显示"待你确认"）；2 已同意；3 已拒绝；4 交易已完成。
 */
function tradeStateText(state?: number, self?: boolean): string {
  if (state === 2) return '已同意'
  if (state === 3) return '已拒绝'
  if (state === 4) return '交易已完成'
  if (state === 0 || state === 1) return self ? '等待对方处理' : '待你确认'
  return '未确认'
}

/** 交易状态徽标配色：待处理(0/1)橙色、已同意(2)绿色、已拒绝(3)红色、已完成(4)蓝色 */
function tradeStateClass(state?: number): string {
  if (state === 2) return 'is-accepted'
  if (state === 3) return 'is-rejected'
  if (state === 4) return 'is-completed'
  if (state === 0 || state === 1) return 'is-pending'
  return ''
}

/** 正在处理接受/拒绝的卡片 key（按钮 disabled 用，防止重复提交） */
const actingTradeKey = ref('')

/** 接受(select=2)/拒绝(select=3)交易请求：成功后强制刷新当前会话交易卡片的交易状态 */
async function handleTradeAction(msg: ChatMessage, select: 2 | 3) {
  const sid = sessionId.value
  const gid = tradeGoodsIdOf(msg)
  // 当前用户是接收方，操作针对的"对方"是交易请求的发送方 msg.fromUid
  const toUid = msg.fromUid
  if (!sid || !gid || !toUid) return
  const key = tradeCacheKey(gid)
  if (actingTradeKey.value === key) return
  actingTradeKey.value = key
  try {
    await handleTradeRequest({ goodsId: gid, sessionId: sid, select, toUid })
    await refreshVisibleTradeStates()
  } catch (error) {
    console.error('处理交易请求失败:', error)
    alert('操作失败，请稍后重试')
  } finally {
    actingTradeKey.value = ''
  }
}

/** 是否从商品页"购买"进入（route.query.from=buy）：进入聊天后自动向卖家发送交易请求 */
const fromBuyPage = computed(() => route.query.from === 'buy')

/**
 * 自动发送交易请求：点击商品页"购买"跳转进来时触发（msgType=4，content 为商品 id）。
 * 发送成功后清除 query 标记，避免刷新/重复进入时再次自动发送。
 */
const autoTradeSent = ref(false)

async function autoSendBuyTrade() {
  const gid = route.query.goodsId
  if (autoTradeSent.value || !fromBuyPage.value || !gid) return
  // STOMP 未连接时不弹提示，等连接建立后由 watch(connected) 自动补发
  if (!connected.value) return
  autoTradeSent.value = true
  // 交易请求消息 msgType=4：content 冗余存商品 id，goodsId 字段专门携带请求交易的商品 id
  const ok = await sendChat(4, String(gid), String(gid))
  if (!ok) {
    // 发送失败：重置标记以便再次尝试
    autoTradeSent.value = false
    return
  }
  // 交易请求已发出，清除 from=buy 标记，防止页面刷新后重复自动发送
  const query = { ...route.query }
  delete query.from
  delete query.goodsId
  router.replace({ query })
}

/** 点击商品卡片消息：跳转到商品详情页 /item/{goodsId} */
function goGoodsDetail(goodsId: number | string) {
  router.push({ name: 'item', params: { id: String(goodsId) } })
}

/** 向上滚动到底部时加载更早一页，并把新增内容追加到顶部、保持滚动位置不跳动 */
async function loadOlder() {
  const sid = sessionId.value
  if (!sid || loadingOlder.value || !hasMore.value) return
  loadingOlder.value = true
  const el = messageListRef.value
  const prevHeight = el?.scrollHeight ?? 0
  const prevScrollTop = el?.scrollTop ?? 0
  try {
    const res = await getMessageHistory(sid, pageNumber.value + 1)
    if (res.code === 1 && res.data) {
      const rows = res.data.rows || []
      if (rows.length === 0) {
        hasMore.value = false
        return
      }
      const older = mapRows(rows).sort((a, b) => parseTime(a.sendTime) - parseTime(b.sendTime))
      messages.value = [...older, ...messages.value]
      pageNumber.value += 1
      if (rows.length < PAGE_SIZE) hasMore.value = false
      nextTick(() => {
        const listEl = messageListRef.value
        if (listEl) listEl.scrollTop = listEl.scrollHeight - prevHeight + prevScrollTop
      })
    }
  } catch (error) {
    console.error('加载更早消息失败:', error)
  } finally {
    loadingOlder.value = false
  }
}

function handleScroll() {
  const el = messageListRef.value
  if (el && el.scrollTop <= 40) {
    loadOlder()
  }
}

onMounted(() => {
  if (chatId.value) {
    sessionId.value = String(chatId.value)
    loadHistory(chatId.value)
    fetchLenovoGoods()
    // 从商品页"购买"进入：聊天打开后自动发送交易请求
    autoSendBuyTrade()
  }

  removeMessageHandler = onMessage((msg: ChatMessage) => {
    // 私聊按发送人 uid 过滤会话：WS 载荷里的 sessionId 是消息自身的雪花 id（每次消息都不同），
    // 不能用来匹配会话；接收方的 toUid 等于当前聊天对象的 uid。
    if (msg.fromUid != null && toUid.value != null && String(msg.fromUid) === String(toUid.value)) {
      messages.value.push(msg)
      scrollToBottom()
      // 对方有新消息时顺手刷新交易卡片状态（对方可能刚接受/拒绝了交易请求）
      refreshVisibleTradeStates()
    }
  })
})

onUnmounted(() => {
  removeMessageHandler?.()
  clearLenovoHideTimer()
})

watch(chatId, (newId) => {
  if (newId) {
    sessionId.value = String(newId)
    messages.value = []
    loadHistory(newId)
    fetchLenovoGoods()
    autoSendBuyTrade()
  }
})

// 从"购买"进入时 STOMP 尚未连上的话，等连接建立后再补发交易请求
watch(connected, (value) => {
  if (value) autoSendBuyTrade()
})
</script>

<style scoped>
.message-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f5f5f7;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 17px;
}

.logo-wrapper {
  margin-bottom: 7px;
}

.logo-wrapper img {
  width: 64px;
  height: 64px;
  display: block;
}

.placeholder-title {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.14;
  letter-spacing: 0.196px;
  color: #1d1d1f;
  margin: 0;
}

.placeholder-subtitle {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #7a7a7a;
  margin: 0;
}

/* ========== 聊天头部 ========== */
.message-header {
  padding: 17px 24px;
  border-bottom: 1px solid #e5e5ea;
  background: #ffffff;
}

.header-name {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 600;
  color: #1d1d1f;
}

/* ========== 消息气泡 ========== */
.message-bubble-wrapper {
  display: flex;
  margin-bottom: 8px;
  padding: 0 24px;
}

.message-bubble-wrapper.message-self {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
  word-break: break-word;
}

.message-bubble-wrapper:not(.message-self) .message-bubble {
  background: #e9e9eb;
  color: #1d1d1f;
  border-bottom-left-radius: 4px;
}

.message-bubble-wrapper.message-self .message-bubble {
  background: #007aff;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.bubble-text {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  line-height: 1.4;
}

.bubble-time {
  margin-top: 4px;
  font-size: 11px;
  text-align: right;
  opacity: 0.6;
}

/* 链接消息（msgType=2） */
.bubble-link {
  color: #007aff;
  text-decoration: underline;
  word-break: break-all;
}

/* ========== 商品卡片消息（msgType=3） ========== */
.message-goods {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 320px;
}

.message-bubble-wrapper:not(.message-self) .message-goods {
  align-items: flex-start;
}

.goods-msg-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e5e5ea;
  border-radius: 11px;
  box-sizing: border-box;
  cursor: pointer;
  transition: background-color 0.2s;
}

.goods-msg-card:hover {
  background: #f5f5f7;
}

.goods-msg-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.goods-msg-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.goods-msg-desc {
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
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.goods-msg-price {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
}

/* 商品信息未加载 / 已失效时的占位文案 */
.goods-msg-state {
  width: 100%;
  padding: 14px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  color: #8e8e93;
  background: #ffffff;
  border: 1px solid #e5e5ea;
  border-radius: 11px;
  box-sizing: border-box;
  text-align: center;
}

.goods-msg-time {
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.6;
}

/* ========== 交易请求卡片（msgType=4） ========== */
.message-trade {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 320px;
}

.message-bubble-wrapper:not(.message-self) .message-trade {
  align-items: flex-start;
}

.trade-msg-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e5e5ea;
  border-radius: 11px;
  box-sizing: border-box;
  cursor: pointer;
  transition: background-color 0.2s;
}

.trade-msg-card:hover {
  background: #f5f5f7;
}

.trade-msg-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.trade-msg-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trade-msg-desc {
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
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.trade-msg-price {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
}

/* 交易状态徽标：未确认(0)/已有请求(1)/已同意(2)/已拒绝(3)/已完成(4) */
.trade-msg-state {
  flex-shrink: 0;
  padding: 4px 10px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  color: #8e8e93;
  background: #f2f2f7;
  border-radius: 9999px;
}

.trade-msg-state.is-pending {
  color: #b25e09;
  background: #fdeedb;
}

.trade-msg-state.is-accepted {
  color: #1c7c3c;
  background: #e3f6e9;
}

.trade-msg-state.is-rejected {
  color: #b3261e;
  background: #fdecea;
}

.trade-msg-state.is-completed {
  color: #175cd3;
  background: #e8f0fe;
}

/* 交易请求加载 / 失效占位 */
.trade-msg-placeholder {
  width: 100%;
  padding: 14px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  color: #8e8e93;
  background: #ffffff;
  border: 1px solid #e5e5ea;
  border-radius: 11px;
  box-sizing: border-box;
  text-align: center;
}

/* 接受/拒绝操作按钮 */
.trade-msg-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.trade-msg-btn {
  padding: 5px 16px;
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
  transition:
    background-color 0.2s,
    opacity 0.2s,
    transform 0.1s;
}

.trade-msg-btn:active {
  transform: scale(0.97);
}

.trade-msg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trade-msg-btn-accept {
  color: #ffffff;
  background-color: #007aff;
}

.trade-msg-btn-accept:hover {
  background-color: #0062cc;
}

.trade-msg-btn-reject {
  color: #1d1d1f;
  background-color: #e9e9eb;
}

.trade-msg-btn-reject:hover {
  background-color: #dcdce0;
}

.trade-msg-time {
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.6;
}

/* 历史消息加载提示 */
.history-loading {
  padding: 8px 24px;
  text-align: center;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  line-height: 1.33;
  color: #8e8e93;
}

.message-bubble-wrapper:not(.message-self) .bubble-time {
  opacity: 0.5;
}

/* ========== 聊天容器 ========== */
.message-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #f5f5f7;
}

/* ========== 消息内容区域 ========== */
.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px 24px;
  scroll-behavior: smooth;
}

.message-content::-webkit-scrollbar {
  width: 6px;
}

.message-content::-webkit-scrollbar-track {
  background: transparent;
}

.message-content::-webkit-scrollbar-thumb {
  background: #c1c1c6;
  border-radius: 3px;
}

.message-content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a6;
}

/* ========== 会话商品联想卡片 ========== */
.lenovo-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 24px 12px;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e5e5ea;
  border-radius: 11px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.lenovo-card:hover {
  background: #f5f5f7;
}

.lenovo-card:active {
  transform: scale(0.99);
}

.lenovo-card-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.lenovo-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lenovo-card-desc {
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
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lenovo-card-price {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
}

/* 联想卡右侧操作区：发起交易请求按钮 + 点击发送 */
.lenovo-card-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.lenovo-card-trade {
  padding: 5px 12px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #b25e09;
  background: #fdeedb;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s,
    transform 0.1s;
}

.lenovo-card-trade:hover {
  background: #fbe0c2;
  color: #8f4c07;
}

.lenovo-card-trade:active {
  transform: scale(0.97);
}

.lenovo-card-send {
  flex-shrink: 0;
  padding: 6px 12px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  background-color: #007aff;
  border-radius: 9999px;
}

.lenovo-card-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 18px;
  line-height: 1;
  color: #8e8e93;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.lenovo-card-close:hover {
  background: #e9e9eb;
  color: #1d1d1f;
}

/* ========== 输入框区域 ========== */
.input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background-color: #ffffff;
  border-top: 1px solid #e5e5ea;
}

.input-container input {
  flex: 1;
  height: 40px;
  padding: 0 16px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  color: #1d1d1f;
  background-color: #f5f5f7;
  border: 1px solid #e5e5ea;
  border-radius: 20px;
  outline: none;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.input-container input::placeholder {
  color: #8e8e93;
}

.input-container input:focus {
  background-color: #ffffff;
  border-color: #007aff;
}

.input-container button {
  height: 40px;
  padding: 0 24px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #ffffff;
  background-color: #007aff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;
}

.input-container button:hover {
  background-color: #0062cc;
}

.input-container button:active {
  transform: scale(0.97);
}

.input-container button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
