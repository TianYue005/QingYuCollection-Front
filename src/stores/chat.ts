import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ChatMessage } from '@/types/chat'

/** 待插入会话列表的乐观会话（点击"聊一聊"发起会话后写入） */
export interface PendingChat {
  sessionId: number | string
  toUid: number | string
  name: string
  icon?: string
}

/**
 * 聊天相关全局状态
 *
 * 场景：在商品详情页点击"聊一聊"时，商品详情里能拿到卖家 userId，
 * 这里把该 id 存入 ChatPartnerID，供 MessageView 读取作为私聊目标用户。
 */
export const useChatStore = defineStore('chat', () => {
  /** 当前聊天目标用户的 id（雪花 id 是字符串） */
  const ChatPartnerID = ref<number | string | null>(null)

  /**
   * 乐观插入会话列表的会话信息：
   * 发起会话后后端会话列表尚未包含该会话（未聊过的新对象），
   * 聊天页加载列表时用它补到列表顶部，实现"无缝开聊"。
   */
  const PendingChat = ref<PendingChat | null>(null)

  /**
   * 自己刚发出的消息（后端私聊不会回传给发送者）：
   * MessageView 发送后写入，ChatView 用它同步左侧会话列表的最后一条消息。
   */
  const SentMessage = ref<ChatMessage | null>(null)

  /** 设置聊天目标用户 id */
  function setChatPartnerID(id: number | string | null) {
    ChatPartnerID.value = id
  }

  /** 设置乐观插入会话列表的会话信息 */
  function setPendingChat(chat: PendingChat | null) {
    PendingChat.value = chat
  }

  /** 记录自己刚发出的消息 */
  function setSentMessage(msg: ChatMessage | null) {
    SentMessage.value = msg
  }

  return { ChatPartnerID, setChatPartnerID, PendingChat, setPendingChat, SentMessage, setSentMessage }
})
