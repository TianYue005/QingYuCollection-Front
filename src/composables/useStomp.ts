import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { ref } from 'vue'
import type { ChatMessage } from '@/types/chat'

type MessageHandler = (message: ChatMessage) => void

/** 从本地存储读取 JWT（纯 token，不带 Bearer 前缀） */
function getToken(): string {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

/**
 * STOMP 全局单例客户端。
 *
 * 与后端 StompWebSocketConfig 的约定：
 * 1. 连接地址 /stomp/ws 开启了 SockJS，握手(beforeHandshake)直接从 URL query 拿 token 解析用户身份，
 *    因此 token 必须放在 query 里（/stomp/ws?token=纯JWT），不能带 "Bearer " 前缀，
 *    也不能走 Authorization 头（握手代码不会做 Bearer 剥离，会解析失败被拒连）。
 * 2. webSocketFactory 每次（含断线自动重连）都重新读取 token，保证 token 更新后能拿到最新值。
 */
const client = new Client({
  webSocketFactory: () => {
    const token = getToken()
    return new SockJS(`/stomp/ws?token=${encodeURIComponent(token)}`)
  },
  reconnectDelay: 5000,
  heartbeatIncoming: 4000,
  heartbeatOutgoing: 4000,
})

/** 当前是否已建立 STOMP 连接（CONNECTED 帧已收到） */
const connected = ref(false)

// 私聊：订阅 /user/exchange/amq.direct/private，后端按连接时解析出的用户身份自动路由到"当前用户自己"
let privateSubscription: StompSubscription | null = null
const privateHandlers = new Set<MessageHandler>()

// 群聊：roomId -> 订阅句柄 / 处理器集合（订阅目标 /topic/room.{roomId}）
const roomSubscriptions = new Map<string, StompSubscription>()
const roomHandlers = new Map<string, Set<MessageHandler>>()

function notifyPrivate(message: ChatMessage) {
  privateHandlers.forEach((fn) => fn(message))
}

function notifyRoom(roomId: string, message: ChatMessage) {
  roomHandlers.get(roomId)?.forEach((fn) => fn(message))
}

/** 连接成功后订阅私聊队列，并补订所有已登记的群聊房间 */
function subscribeAll() {
  if (!privateSubscription) {
    privateSubscription = client.subscribe('/user/exchange/amq.direct/private', (msg: IMessage) => {
      notifyPrivate(JSON.parse(msg.body) as ChatMessage)
    })
  }
  roomHandlers.forEach((_, roomId) => {
    subscribeRoomInternal(roomId)
  })
}

function subscribeRoomInternal(roomId: string) {
  if (roomSubscriptions.has(roomId)) return
  const sub = client.subscribe(`/topic/room.${roomId}`, (msg: IMessage) => {
    notifyRoom(roomId, JSON.parse(msg.body) as ChatMessage)
  })
  roomSubscriptions.set(roomId, sub)
}

export function useStomp() {
  const token = getToken()

  // 只在有 token 时启动连接
  if (!client.active && token) {
    client.onConnect = () => {
      connected.value = true
      subscribeAll()
    }
    client.onWebSocketClose = () => {
      connected.value = false
      // 订阅句柄随连接失效，重连成功后由 onConnect 重新订阅
      privateSubscription = null
      roomSubscriptions.clear()
    }
    client.onStompError = (frame) => {
      console.error('[STOMP] 错误:', frame.headers['message'], frame.body)
    }
    client.activate()
  }

  const isConnected = () => client.connected

  /**
   * 发送私聊消息
   * 目的地：/app/chat/privateMessage
   * 后端自动填 fromUid / id / sessionId / sendTime / isRead，
   * 前端只需传 toUid / groupId(=0) / content / msgType。
   */
  const sendPrivateMessage = (message: ChatMessage) => {
    if (!client.connected) {
      console.warn('[STOMP] 未连接，私聊消息发送失败')
      return false
    }
    client.publish({
      destination: '/app/chat/privateMessage',
      body: JSON.stringify(message),
    })
    return true
  }

  /**
   * 发送群聊消息（群聊 UI 暂未接入，方法预留）
   * 目的地：/app/chat/sendMessage/{roomId}，后端用路径里的 roomId 覆盖 message.groupId
   */
  const sendGroupMessage = (roomId: number | string, message: ChatMessage) => {
    if (!client.connected) {
      console.warn('[STOMP] 未连接，群聊消息发送失败')
      return false
    }
    client.publish({
      destination: `/app/chat/sendMessage/${roomId}`,
      body: JSON.stringify(message),
    })
    return true
  }

  /**
   * 订阅私聊消息（/user/exchange/amq.direct/private），返回取消订阅函数。
   * 注意：私聊后端只推给接收方、不会回传给发送者，发送方自己的消息需本地渲染。
   */
  const onMessage = (handler: MessageHandler) => {
    privateHandlers.add(handler)
    return () => {
      privateHandlers.delete(handler)
    }
  }

  /**
   * 订阅群聊房间（/topic/room.{roomId}），返回取消订阅函数（方法预留）。
   * 群聊会广播给包括发送者在内的所有订阅者，接收消息时无需再本地渲染自己的消息。
   */
  const subscribeRoom = (roomId: number | string, handler: MessageHandler) => {
    const key = String(roomId)
    const set = roomHandlers.get(key) ?? new Set<MessageHandler>()
    set.add(handler)
    roomHandlers.set(key, set)
    if (client.connected) {
      subscribeRoomInternal(key)
    }
    return () => {
      set.delete(handler)
    }
  }

  /** 断开连接并清空全部订阅处理器（登出时调用） */
  const disconnect = () => {
    privateHandlers.clear()
    roomHandlers.clear()
    connected.value = false
    client.deactivate()
  }

  return { connected, isConnected, sendPrivateMessage, sendGroupMessage, onMessage, subscribeRoom, disconnect }
}
