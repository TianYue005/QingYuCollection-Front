import api from './index'
import type { Result } from './user'

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
  imgList: GoodsImage[]
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
