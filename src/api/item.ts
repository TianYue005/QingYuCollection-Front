import api from './index'
import type { Result, ProductAssociationVO } from './user'

/** 图片对象（与后端 Picture 类对应） */
export interface Picture {
  url: string
  width: number
  height: number
}

export interface UploadItemDTO {
  image: Picture[]
  description: string
  price: number
  originalPrice: number
  specs: string[]
}

/** 商品 VO（与后端 /items/{id} 和 /items/list 返回一致，对应 Goods 类） */
export interface ItemVO {
  goodsId: string
  userId: number
  goodsDesc: string
  price: number
  originalPrice: number
  tags: string
  isDeleted: number
  createTime: string
  updateTime: string
  images: GoodsImage[]
}

/** 商品图片 */
export interface GoodsImage {
  goodsId: string
  imgUrl: string
  imgWidth: number
  imgHeight: number
}

/** 分页商品 VO（含图片集合） */
export interface GoodsVO {
  goodsId: string
  userId: number
  userName: string
  goodsDesc: string
  price: number
  originalPrice: number
  tags: string
  /** 当前用户是否已收藏 */
  favourite: boolean
  imgList: GoodsImage[]
}

/** 我已卖出的商品（与后端 /items/select/mySold 返回的 GoodsVO 对齐，只包含已完成交易的记录） */
export interface SoldGoodsVO {
  goodsId: string
  userId?: number | string
  goodsDesc?: string
  price?: number | string
  userName?: string
  originalPrice?: number | string
  tags?: string
  /** 是否已收藏 */
  favourite?: boolean
  /** 简易图片展示：首图平铺字段 */
  imgUrl?: string
  imgWidth?: number
  imgHeight?: number
  /** 0 说明没有卖出，非 0 则卖给了该用户 id */
  sold?: number | string
  /** 交易是否完成（null 未完成） */
  finished?: number | string
  /** 是否有评价：1 为有，0 为无 */
  hasEvaluate?: number | string
}

/** 分页结果 */
export interface PageResult<T> {
  total: number
  rows: T[]
}

/** 分页查询参数 */
export interface ItemQueryParam {
  beginTime?: string
  endTime?: string
  pageNumber?: number
  pageSize?: number
  sortRules?: string
}

/** 关键词搜索参数 */
export interface KeywordSearchParam {
  keyword: string
  pageNumber?: number
  pageSize?: number
}

/** 上传图片，返回 Picture 列表（含 url、width、height） */
export const uploadImages = (files: File[]) => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  return api.post<any, Result<Picture[]>>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    baseURL: '',
  })
}

/** 商品上架 */
export const addItem = (data: UploadItemDTO) => {
  return api.post<any, Result<string>>('/items/add', data)
}

/** 根据ID查找商品 */
export const getItemById = (id: string) => {
  return api.get<any, Result<GoodsVO>>(`/items/${id}`)
}

/**
 * 根据商品 id 查询商品简略信息（实现聊天中商品卡片消息 / 会话列表的展示）
 * 注意：该接口直接返回 ProductAssociationVO（不包 Result），商品不存在或已删除时返回 null
 */
export const selectBriefInfo = (goodsId: number | string) => {
  return api.get<any, ProductAssociationVO | null>(`/items/select/briefInfo/${goodsId}`)
}

/** 查找所有商品 */
export const getItemsList = () => {
  return api.get<any, Result<ItemVO[]>>('/items/list')
}

/** 分页查询商品 */
export const getItemsToPage = (params: ItemQueryParam) => {
  return api.get<any, Result<PageResult<GoodsVO>>>('/items/select', { params })
}

/** 根据关键词模糊搜索商品 */
export const searchItemsByKeyword = (params: KeywordSearchParam) => {
  return api.get<any, Result<PageResult<GoodsVO>>>('/items/search', { params })
}

/** 查询当前用户发布的商品 */
export const getMyItems = () => {
  return api.get<any, Result<PageResult<GoodsVO>>>('/items/myItems')
}

/**
 * 商品评论
 * ============================================================
 * 与后端 ItemController 对齐（@RequestMapping("/api/items")）：
 * - addItemComment: POST /items/add/comment/item，@RequestBody CommentGoods
 * - selectItemComment: GET /items/select/comment/item?goodsId=，返回 PageResult<CommentGoodsVO>
 * - selectItemCommentInteraction: GET /items/select/comment/item/{id}，@PathVariable 评论 id
 * ============================================================
 */

/** 商品评论提交参数（与后端 CommentGoods 实体对齐，goodsId/parentId/text 等由前端传递） */
export interface AddGoodsCommentParam {
  /** 商品 id（后端 Integer，前端传递） */
  goodsId: number
  /** 等于 0 为父评论，大于 0 为回复 */
  parentId: number
  /** 评论内容 */
  text: string
  /** 评论包含的图片（多个用 "," 分割） */
  picture: string
  /** 子评论数量（0 没有，其他为几个子评论） */
  son: number
  createTime: string
  /** 好评(true)/差评(false)，仅父评论有意义，回复不传 */
  goodOrBad?: boolean
  /** 发送评论用户的 id */
  userId: number
  /** 被回复用户的 id（前端传递） */
  replyUserId: number | null
}

/** 商品评论视图对象（与后端 CommentGoodsVO 对齐） */
export interface CommentGoodsVO {
  id: number
  goodsId: number
  parentId: number
  text: string
  picture: string
  son: number
  createTime: string
  level: number
  userId: number
  userAvatar: string
  userName: string
  replyUserId: number
  replyUserAvatar: string
  replyUserName: string
}

/** 发表商品评论 */
export const addItemComment = (comment: AddGoodsCommentParam) => {
  return api.post<any, Result<Object>>('/items/add/comment/item', comment)
}

/** 查看商品评论（后端要求必传 goodsId 查询参数） */
export const selectItemComment = (goodsId: number) => {
  return api.get<any, Result<PageResult<CommentGoodsVO>>>('/items/select/comment/item', {
    params: { goodsId },
  })
}

/** 查看某条商品评论之前的所有互动（@PathVariable 评论 id） */
export const selectItemCommentInteraction = (commentId: number) => {
  return api.get<any, Result<PageResult<CommentGoodsVO>>>(`/items/select/comment/item/${commentId}`)
}

/**
 * 查询我已经卖出的商品（分页查询，仅查询功能）
 * 注意：后端该控制器直接返回 PageResult，没有外层 Result(code/msg/data) 包装；
 * 为兼容起见返回值类型同时声明为两种结构。
 */
export const getMySoldItems = (params: ItemQueryParam) => {
  return api.get<any, Result<PageResult<SoldGoodsVO>> | PageResult<SoldGoodsVO>>(
    '/items/select/mySold',
    { params },
  )
}

/**
 * 查询我已经购买的商品（分页查询，仅查询功能）
 * 注意：后端该控制器直接返回 PageResult，没有外层 Result(code/msg/data) 包装；
 * 为兼容起见返回值类型同时声明为两种结构。
 */
export const getMyPurchasedItems = (params: ItemQueryParam) => {
  return api.get<any, Result<PageResult<SoldGoodsVO>> | PageResult<SoldGoodsVO>>(
    '/items/select/myPurchase',
    { params },
  )
}

/** 评价交易对方参数（与后端 EvaluateDTO 对齐） */
export interface EvaluateDTO {
  /** 商品 id */
  goodsId: string | number
  /** 评价内容 */
  content: string
  /** 评价分数（1-5） */
  score: number
}

/**
 * 评价交易对方（POST /items/evaluate）
 * 仅交易双方且交易完成后可评价，score 超过 5 或非交易双方会被后端拒绝
 */
export const addEvaluate = (data: EvaluateDTO) => {
  return api.post<any, Result<string>>('/items/evaluate', data)
}

/**
 * 卖家评价买家（POST /items/evaluate/buyer）
 * 后端根据当前用户身份自动判断被评价方，其余校验同买家评价卖家
 */
export const addEvaluateBuyer = (data: EvaluateDTO) => {
  return api.post<any, Result<string>>('/items/evaluate/buyer', data)
}
