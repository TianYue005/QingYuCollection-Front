import api from './index'
import type { Result } from './user'

export interface UploadItemDTO {
  image: string[]
  description: string
  price: number
  originalPrice: number
  specs: string[]
}

/** 商品 VO（与后端 /items/{id} 和 /items/list 返回一致） */
export interface ItemVO {
  goodsId: number
  goodsDesc: string
  price: number
  originalPrice: number
  tags: string
  isDeleted: number
  createTime: string
  updateTime: string
}

/** 商品图片 */
export interface GoodsImage {
  goodsId: number
  imgUrl: string
  imgWidth: number
  imgHeight: number
}

/** 分页商品 VO（含图片集合） */
export interface GoodsVO {
  goodsId: number
  userId: number
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

/** 上传图片，返回 OSS 链接列表 */
export const uploadImages = (files: File[]) => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  return api.post<any, Result<string[]>>('/upload', formData, {
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
  return api.get<any, Result<ItemVO>>(`/items/${id}`)
}

/** 查找所有商品 */
export const getItemsList = () => {
  return api.get<any, Result<ItemVO[]>>('/items/list')
}

/** 分页查询商品 */
export const getItemsToPage = (params: ItemQueryParam) => {
  return api.get<any, Result<PageResult<GoodsVO>>>('/items/select', { params })
}
