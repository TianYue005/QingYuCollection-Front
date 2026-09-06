import api from './index'

export interface RegisterParams {
  username: string
  account: string
  password: string
}

export interface LoginParams {
  account: string
  password: string
}

export interface Result<T> {
  code: number
  msg: string
  data: T
}

/** 用户注册 */
export const register = (data: RegisterParams) => {
  return api.post<any, Result<string>>('/user/register', data)
}

/** 用户登录，返回 Result，data 为 JWT 令牌 */
export const login = (data: LoginParams) => {
  return api.post<any, Result<string>>('/user/login', data)
}

export interface UserInfo {
  id: number
  username: string
  account: string
}

export const getUserInfo = (id: number) => {
  return api.get<any, Result<UserInfo>>(`/user/info/${id}`)
}

/**
 * 会话列表项（对应后端 ChatMessageListVO）
 * 注意：后端 Jackson 把 Long 序列化为字符串，sessionId/fromUid/toUid/groupId 可能是 string
 */
export interface ChatListVO {
  id?: number | string
  sessionId: number | string
  /** 对方用户id：前端点开会话、发消息时需要（对应后端 ChatMessageListVO.userId） */
  userId?: number | string
  fromUid?: number | string
  toUid?: number | string
  groupId?: number | string
  content: string
  msgType?: number
  startTime?: string
  sendTime?: string
  /** 聊天列表的头像 */
  avatar?: string
  /** 对方用户名 */
  userName?: string
}

export const getChatList = () => {
  return api.get<any, Result<ChatListVO[]>>('/websocket/chatlist')
}

/**
 * 发起会话（私聊）：后端创建或复用双方会话
 * @param toUserId 目标用户 id
 * @param goodsId 要聊的商品 id，传 0 表示不谈论具体商品
 * 注意：该接口直接返回裸 sessionId 字符串（雪花 Long），没有包 Result；
 * 超出 JS 安全整数范围时会被 json-bigint 转成字符串。
 */
export const createChatSession = (toUserId: number | string, goodsId: number | string) => {
  return api.post<any, string | number>(`/websocket/chat/${toUserId}/${goodsId}`)
}

/** 商品简略信息 + 交易信息（对应后端 ProductAssociationVO；goodsId 雪花 Long 被序列化成字符串） */
export interface ProductAssociationVO {
  goodsDesc: string
  goodsId: number | string
  price: number
  imgUrl?: string
  imgWidth?: number
  imgHeight?: number
  /** 交易状态：0 未确认，1 已有请求，2 已同意，3 已拒绝，4 交易已完成 */
  tradeState?: number
  /** 请求方（发送交易请求的一方）用户 id */
  fromUid?: number | string
  /** 接收方用户 id */
  toUid?: number | string
}

/**
 * 会话商品联想：根据 sessionId 返回与该会话关联的商品简略信息
 * 注意：该接口直接返回 ProductAssociationVO 对象（不包 Result），返回 null 表示该会话无需联想
 */
export const tradeRequestLenovo = (sessionId: number | string) => {
  return api.get<any, ProductAssociationVO | null>(`/websocket/tradeRequest/lenovo/${sessionId}`)
}

/**
 * 交易信息以及交易状态：根据会话与商品 id 查询交易请求的商品简略信息与交易状态
 * GET /websocket/tradeRequest/tradeState/{session_id}/{goods_id}
 * 注意：该接口直接返回 ProductAssociationVO 对象（不包 Result），返回 null 表示暂无交易记录
 */
export const selectTradeState = (sessionId: number | string, goodsId: number | string) => {
  return api.get<any, ProductAssociationVO | null>(
    `/websocket/tradeRequest/tradeState/${sessionId}/${goodsId}`,
  )
}

/**
 * 接受 / 拒绝交易请求（仅交易请求的接收方有权限调用；后端先校验权限再落库）
 * POST /websocket/tradeRequest/request
 * body：goodsId 商品 id、sessionId 会话 id、select 选项（2=同意 3=拒绝）、toUid 对方的用户 id
 * 后端直接更新交易状态并同步 goods 表，不返回业务数据。
 */
export const handleTradeRequest = (payload: {
  goodsId: number | string
  sessionId: number | string
  select: 2 | 3
  toUid: number | string
}) => {
  return api.post<any, unknown>('/websocket/tradeRequest/request', payload)
}

/** 待处理交易商品（对应后端 Pending 实体：查询当前用户发布的商品及首张图片） */
export interface Pending {
  /** 商品 id（雪花 Long，可能被序列化为字符串） */
  goodsId: number | string
  /** 商品描述 */
  goodsDesc?: string
  /** 价格 */
  price?: number | string
  /** 商品图片（只存储一张） */
  picture?: string
  /** 是否售出：0 未售出，否则为买家用户 id（Long，可能为字符串） */
  sold?: number | string
}

/**
 * 当前用户的待处理交易：GET /user/pending/{userId}
 * 传递该用户 id，返回该用户待处理的商品及商品信息。
 * 注意：该接口直接返回 Pending 数组（不包 Result）。
 */
export const getUserPending = (userId: number | string) => {
  return api.get<any, Pending[]>(`/user/pending/${userId}`)
}

/** 分页结果（对应后端 PageResult<T>） */
export interface PageResult<T> {
  total: number
  rows: T[]
}

/**
 * 获取历史消息（分页）
 * 注意：聊天历史每页数量固定为 20（后端以此为判定，与其他分页接口区分开），不能传其他 pageSize；
 * sessionId 必须来自会话列表返回的数据。
 */
export const getMessageHistory = (
  sessionId: number | string,
  pageNumber = 1,
) => {
  return api.post<any, Result<PageResult<ChatListVO>>>('/websocket/historyMessage', {
    sessionId,
    pageNumber,
    pageSize: 20,
  })
}

export const toggleFavorite = (id: string) => {
  return api.post<any, Result<number>>(`/user/favourite/${id}`)
}

/** 取消收藏 */
export const removeFavorite = (id: string) => {
  return api.delete<any, Result<number>>(`/user/favouriteRM/${id}`)
}

/** 获取收藏列表（分页） */
export const getFavoriteList = (params: {
  pageNumber?: number
  pageSize?: number
  sortRules?: string
}) => {
  return api.get<any, Result<{ total: number; rows: any[] }>>('/user/favourite', { params })
}

/** 账号基本信息 */
export interface UserAccountInfo {
  userId: number
  userName: string
  account: string
  status: number
  level: number
  credit: number
  balance: string // BigDecimal → string（json-bigint storeAsString）
  avatar: string | null
}

/** 获取账号基本信息 */
export const accountInfo = (account: string) => {
  return api.get<any, Result<UserAccountInfo>>('/user/accountInfo', {
    params: { account }
  })
}

/** 修改密码 */
export const updatePassword = (password: string) => {
  return api.get<any, Result<null>>('/user/updatePassword', {
    params: { password }
  })
}
