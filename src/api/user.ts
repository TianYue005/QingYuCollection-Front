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

/** 登录返回的令牌信息（对应后端 TokenVO） */
export interface TokenVO {
  /** 短期 token：除登录、注册外的所有请求都用它 */
  shortToken: string
  /** 长期 token：仅用于换取新的短期 token */
  longToken?: string
  /** 后端字段名可能首字母大写，做兼容 */
  LongToken?: string
  /** 后端附加提示信息 */
  message?: string
}

/** 用户登录，返回 Result，data 为长期 token + 短期 token */
export const login = (data: LoginParams) => {
  return api.post<any, Result<TokenVO>>('/user/login', data)
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

/**
 * 查询自己的操作码：POST /websocket/tradeRequest/myVerifyCode
 * body（TradePairUp）：goodsId 商品 id 必填。
 * 后端从 Redis 取当前用户针对该商品的验证码，不存在则生成并缓存 5 分钟，直接返回字符串。
 */
export const getMyVerifyCode = (goodsId: number | string) => {
  return api.post<any, string>('/websocket/tradeRequest/myVerifyCode', { goodsId })
}

/**
 * 提交对方的操作码：POST /websocket/tradeRequest/otherVerifyCode
 * body（TradePairUp）：goodsId 商品 id、otherVerifyCode 填写的验证码、operate 固定为 1。
 * 返回数字：1=自己先填、等待对方填写完成交易；2=交易完成；其他=交易过程发生错误。
 */
export const submitOtherVerifyCode = (payload: {
  goodsId: number | string
  otherVerifyCode: string
  operate: number
}) => {
  return api.post<any, number>('/websocket/tradeRequest/otherVerifyCode', payload)
}

/**
 * 拒绝交易：POST /websocket/tradeRequest/Reject/{goodsId}
 * 仅针对已同意但未完成的交易，后端会把 goods.sold 重置为 NULL（交易取消，商品回到待售状态）。
 * 返回 Result<String>，code=1 表示操作成功。
 */
export const rejectTradeRequest = (goodsId: number | string) => {
  return api.post<any, Result<string>>(`/websocket/tradeRequest/Reject/${goodsId}`)
}

/** 待处理交易商品（对应后端 Pending 实体：查询当前用户已同意但未结束交易的商品） */
export interface Pending {
  /** 商品 id（雪花 Long，可能被序列化为字符串） */
  goodsId: number | string
  /** 商品描述 */
  goodsDesc?: string
  /** 价格 */
  price?: number | string
  /** 商品图片（只存储一张） */
  picture?: string
}

/**
 * 当前用户的待处理交易：GET /api/user/pending/wait
 * 后端根据登录 Token 从 UserContext 获取当前用户，无需前端传参。
 * 注意：该接口直接返回 Pending 数组（不包 Result）。
 */
export const getUserPending = () => {
  return api.get<any, Pending[]>('/user/pending/wait')
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

/**
 * 收藏列表项（与后端 /user/favourite 的 selectFavourite 返回对齐）
 * 图片已通过 LEFT JOIN 只取第一张，并以 imgUrl/imgWidth/imgHeight 平铺字段下发（不含 imgList）
 */
export interface FavoriteItemVO {
  goodsId: string
  goodsDesc: string
  price: number | string
  originalPrice: number | string
  imgUrl: string
  imgWidth: number
  imgHeight: number
}

/** 获取收藏列表（分页） */
export const getFavoriteList = (params: {
  pageNumber?: number
  pageSize?: number
  sortRules?: string
}) => {
  return api.get<any, Result<PageResult<FavoriteItemVO>>>('/user/favourite', { params })
}

/** 评价视图对象（对应后端 EvaluateVO） */
export interface EvaluateVO {
  id: number
  /** 评价人 */
  evaluatorId: number | string
  evaluatorName: string
  evaluatorAvatar: string
  /** 被评价人 */
  evaluatedId: number | string
  evaluatedName: string
  evaluatedAvatar: string
  content: string
  /** 评价分数 1-5 */
  score: number
  createTime: string
  goodsId: number | string
  goodsDesc: string
  goodsImgUrl: string
}

/** 其他用户的详情（对应后端 /user/thisUserDetail/{userId} 返回的 User） */
export interface UserDetail {
  userId: number | string
  userName: string
  /** 该接口暂未返回头像，缺失时前端展示默认头像 */
  avatar?: string | null
  level?: number
  credit?: number
  /** 1 正常，2 冻结 */
  status?: number
}

/**
 * 查看其他用户的详情：GET /api/user/thisUserDetail/{userId}
 * @param userId 被查看用户的 id（来自路由参数，见 views/UserDatailView.vue 顶部说明）
 */
export const getThisUserDetail = (userId: number | string) => {
  return api.get<any, Result<UserDetail>>(`/user/thisUserDetail/${userId}`)
}

/**
 * 查看评论（该用户对别人的 / 别人对该用户的）
 * GET /api/user/myReview，参数为 ItemQueryParam：userId + target + trait + 分页，
 * 返回 Result<PageResult<EvaluateVO>>
 * @param userId 要查询的用户 id：UserDatailView 传被查看用户的 id，CreditAndReviewsView 传当前登录用户的 id
 * @param target 0=该用户对别人的评价，1=别人对该用户的评价
 * @param trait  0/null=全部 1=好评（score>=4） 2=差评（score<=3） 3=来自卖家
 * 注意：后端方法签名为 selectMyReview(ItemQueryParam)，无 @RequestBody，
 * 参数由 Spring 直接绑定查询字符串，因此全部走 query 下发。
 */
export const getUserReviewList = (params: {
  userId: number | string
  target: number
  trait?: number
  pageNumber?: number
  pageSize?: number
}) => {
  return api.get<any, Result<PageResult<EvaluateVO>>>('/user/myReview', { params })
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

/** 修改用户名：POST /user/alterName/{name} */
export const alterName = (name: string) => {
  return api.post<any, Result<null>>(`/user/alterName/${encodeURIComponent(name)}`)
}

/**
 * 修改用户头像：PUT /user/avatar
 * 后端以 MultipartFile[] files 接收，因此表单字段名为 files（只传一张）
 * 后端不返回新头像地址，修改成功后需重新拉取账号信息获取 avatar
 */
export const alterAvatar = (file: File) => {
  const formData = new FormData()
  formData.append('files', file)
  return api.put<any, Result<null>>('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
