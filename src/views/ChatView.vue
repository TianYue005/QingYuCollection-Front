<template>
  <NavBanner />
  <!-- 聊天主界面 -->
  <div class="chat-container">
    <!-- 左侧联系人列表 -->
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">消息</h2>
      </div>
      <div class="contact-list">
        <div
          v-for="item in messageSelectList"
          :key="item.sessionId"
          class="contact-item"
          @click="handleContactClick(item)"
        >
          <img class="contact-avatar" :src="item.icon" alt="好友头像" />
          <div class="contact-info">
            <div class="contact-top">
              <span class="contact-name">{{ item.name }}</span>
              <span class="contact-time">{{ item.time }}</span>
            </div>
            <span class="contact-message">{{ item.lastMessage }}</span>
          </div>
        </div>
      </div>
      <!-- 空状态 -->
      <div v-if="messageSelectList.length === 0" class="sidebar-empty">
        <p class="empty-text">暂无消息</p>
      </div>
    </div>
    <!-- 右侧聊天区域 -->
    <div class="chat-main">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBanner from '@/components/NavBanner.vue'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getChatList } from '@/api/user'
import { resolveAvatar } from '@/utils/avatar'
import { useStomp } from '@/composables/useStomp'
import { useChatStore } from '@/stores/chat'
import type { ChatMessage } from '@/types/chat'

type messageSelect = {
  sessionId: number | string
  name: string
  icon: string
  lastMessage: string
  time: string
  toUid: number | string
  /** 消息类型：1 字符串，2 url链接，3 商品卡片，4 交易请求（对应 ChatMessageListVO.msgType） */
  msgType?: number
}

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const messageSelectList = ref<messageSelect[]>([])
/** 最近收到的 WS 消息：由 watch 监控，按 sessionId 更新会话列表最后一条消息 */
const incomingMessage = ref<ChatMessage | null>(null)

const { onMessage } = useStomp()

/** 会话列表时间：今天显示 HH:mm，今年显示 MM-DD，更早显示 YYYY-MM-DD */
function formatTime(time?: string): string {
  if (!time) return ''
  const date = new Date(time.includes('T') ? time : time.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 会话列表"最后一条消息"文案：链接（2）加前缀、商品卡片（3）只显示标记，避免暴露原始商品 id / 商品名 */
function lastMessageText(content?: string, msgType?: number): string {
  if (msgType === 2) return `[链接] ${content || ''}`
  if (msgType === 3) return '[商品]'
  if (msgType === 4) return '[交易请求]'
  return content || ''
}

async function loadChatList() {
  try {
    const res = await getChatList()
    if (res.code === 1 && res.data) {
      messageSelectList.value = res.data.map((item) => ({
        sessionId: item.sessionId,
        name: item.userName || '未知用户',
        icon: resolveAvatar(item.avatar),
        // 链接消息（msgType=2）加前缀提示，商品卡片（msgType=3）只显示标记，避免长 URL / 商品 id 撑爆列表
        lastMessage: lastMessageText(item.content, item.msgType),
        time: formatTime(item.sendTime),
        // userId 即对方用户id（后端 ChatMessageListVO.userId），作为私聊目标 uid
        toUid: item.userId ?? '',
        msgType: item.msgType,
      }))
    }
  } catch (error) {
    console.error('获取会话列表失败:', error)
  }
  mergePendingChat()
}

/**
 * 乐观更新：点击"聊一聊"发起会话后，后端会话列表可能还没包含该会话（未聊过的新对象），
 * 把 store 里的待插入会话补到列表顶部，实现无缝开聊。
 * 已存在同会话（sessionId）或同对象（toUid）时不重复插入。
 */
function mergePendingChat() {
  const pending = chatStore.PendingChat
  if (!pending) return
  const exists = messageSelectList.value.some(
    (item) =>
      String(item.sessionId) === String(pending.sessionId) ||
      (pending.toUid != null && String(item.toUid) === String(pending.toUid)),
  )
  if (exists) return
  messageSelectList.value.unshift({
    sessionId: pending.sessionId,
    name: pending.name || '未知用户',
    icon: resolveAvatar(pending.icon),
    lastMessage: '暂无消息',
    time: formatTime(new Date().toISOString()),
    toUid: pending.toUid,
  })
}

/**
 * 收到 WS 消息后，按 sessionId 定位对应会话，更新其最后一条消息并把该会话置顶；
 * 列表里没有该会话（新会话）时新建条目插入顶部。
 * 会话已存在时保留原有 name/icon/toUid，避免 WS 载荷缺字段时被覆盖成空。
 */
function updateLastMessage(msg: ChatMessage) {
  const sid = String(msg.sessionId)
  const idx = messageSelectList.value.findIndex((item) => String(item.sessionId) === sid)
  const existing = idx >= 0 ? messageSelectList.value[idx] : null
  const entry: messageSelect = {
    sessionId: msg.sessionId,
    name: existing?.name ?? msg.nickName ?? msg.title ?? '未知用户',
    icon: existing?.icon ?? resolveAvatar(msg.avatar),
    lastMessage: lastMessageText(msg.content, msg.msgType),
    time: formatTime(msg.sendTime),
    // 收到的消息对方是 fromUid，自己发的消息对方是 toUid
    toUid: existing?.toUid ?? String(msg.toUid ?? msg.fromUid ?? ''),
    msgType: msg.msgType,
  }
  if (idx >= 0) {
    messageSelectList.value.splice(idx, 1)
  }
  messageSelectList.value.unshift(entry)
}

/** watch 监控 WS 消息：到达即按 sessionId 更新对应会话的最后一条消息（sync 保证逐条处理，不丢消息） */
watch(
  incomingMessage,
  (msg) => {
    if (!msg) return
    updateLastMessage(msg)
  },
  { flush: 'sync' },
)

/** watch 监控自己刚发出的消息：后端私聊不回传发送者，用它同步左侧会话列表 */
watch(
  () => chatStore.SentMessage,
  (msg) => {
    if (!msg) return
    updateLastMessage(msg)
  },
  { flush: 'sync' },
)

let removeMessageHandler: (() => void) | null = null

onMounted(() => {
  loadChatList()
  // WS 消息统一写入 ref，由上面的 watch 按 sessionId 更新会话列表最后一条消息（不再整表刷新）
  removeMessageHandler = onMessage((msg: ChatMessage) => {
    incomingMessage.value = msg
  })
})

onUnmounted(() => {
  removeMessageHandler?.()
})

// 从聊天详情返回列表页时刷新
watch(
  () => route.params.chatId,
  (chatId) => {
    if (!chatId) {
      loadChatList()
    }
  },
)

const handleContactClick = (item: messageSelect) => {
  router.push({
    name: 'chatDetail',
    params: { chatId: item.sessionId },
    query: { toUid: item.toUid, name: item.name },
  })
}

</script>

<style scoped>
/* ===== Apple Design System CSS Variables ===== */
/*
 * 基于 resources/apple/DESIGN.md 的 Apple 设计规范
 * 颜色: ink #1d1d1f, primary #0066cc, canvas #ffffff, parchment #f5f5f7
 * 排版: SF Pro Display (标题) / SF Pro Text (正文)
 * 间距: 4/8/12/17/24/32/48
 * 圆角: none/sm(8)/md(11)/lg(18)/pill(9999)
 * 无装饰阴影 — UI chrome 不使用阴影，仅产品图像可带阴影
 */

/* ===== 聊天主容器 ===== */
.chat-container {
  display: flex;
  height: calc(100vh - 64px);
  max-width: 1440px;
  margin: 0 auto;
  background: #ffffff;
}

/* ===== 左侧联系人列表 ===== */
.chat-sidebar {
  width: 360px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
  background: #fafafc;
}

.sidebar-header {
  padding: 17px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.sidebar-title {
  margin: 0;
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
}

/* ===== 联系人列表 ===== */
.contact-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #f0f0f0;
}

.contact-item:hover {
  background: #f5f5f7;
}

.contact-item:active {
  transform: scale(0.99);
}

.contact-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0;
}

.contact-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.contact-name {
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-time {
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
  white-space: nowrap;
  flex-shrink: 0;
}

.contact-message {
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 空状态 ===== */
.sidebar-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
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
}

/* ===== 右侧聊天区域 ===== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  min-width: 0;
}

/* ===== 响应式 ===== */
@media (max-width: 834px) {
  .chat-sidebar {
    width: 280px;
    min-width: 260px;
  }

  .contact-item {
    padding: 12px 17px;
  }

  .sidebar-header {
    padding: 17px 17px;
  }
}

@media (max-width: 640px) {
  .banner {
    padding: 0 17px;
  }

  .chat-sidebar {
    width: 100%;
    min-width: unset;
    border-right: none;
  }

  .chat-main {
    display: none;
  }

  .chat-sidebar:has(+ .chat-main) ~ .chat-main {
    display: flex;
  }
}
</style>
