/**
 * 聊天消息模型（对应后端 ChatMessage 实体）
 *
 * 注意：
 * - 后端 Jackson 全局把 Long 序列化为字符串，因此雪花 id（id/sessionId）以及 fromUid/toUid/groupId
 *   在 WS 推送与历史接口里都可能是字符串，比较时统一转成 String。
 * - id / fromUid / sendTime / isRead 由后端自动填充，前端发送时不用传；
 *   但 sessionId 必须由前端携带（发送前先通过会话列表 / 创建会话接口拿到）。
 */
export interface ChatMessage {
  /** 主键 id（后端雪花算法生成，字符串） */
  id?: number | string
  /** 会话 id：发送消息时必须携带（后端按它定位会话，缺失会导致会话错乱） */
  sessionId: number | string
  /** 发送人 uid（后端从握手身份自动填充，前端不用传） */
  fromUid?: number | string
  /** 接收用户 id：私聊必传；群聊传 0 */
  toUid?: number | string
  /** 群 id：私聊必须显式传 0；群聊后端用路径里的 roomId 覆盖 */
  groupId?: number | string
  /** 消息内容 */
  content: string
  /**
   * 消息类型：1 = 纯文本，2 = 链接，3 = 商品卡片（content 为商品 id，对方收到后需用
   * /items/select/briefInfo/{goodsId} 查简略信息再展示），
   * 4 = 交易请求（content 为商品 id，双方用 /websocket/tradeRequest/tradeState/{sessionId}/{goodsId}
   * 查询商品信息与交易状态展示；接收方状态为"已有请求"时可接受/拒绝）
   */
  msgType?: number
  /** 发送时间（后端填充） */
  sendTime?: string
  /** 是否已读：0 未读，1 已读（后端填充） */
  isRead?: number
  /** WebSocket 专用变量：0 = 正常聊天，1 = 更新为已读状态（发送时必须传 0，后端 if (type == 0) 才发送） */
  type?: number
  /** WebSocket 专用变量：商品 id。发送交易请求（msgType=4）时携带请求交易的商品的商品 id（content 里仍冗余存一份商品 id 字符串，供历史消息/未带该字段的推送兜底使用） */
  goodsId?: number | string
  /** 聊天列表展示的头像 */
  avatar?: string
  /** 聊天标题（对方用户名/群聊名） */
  title?: string
  /** 发送人昵称 */
  nickName?: string
}
