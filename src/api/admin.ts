import api from './index'
import type { Result, TokenVO } from './user'

/** 管理员登录参数（对应后端 LoginDTO） */
export interface AdminLoginParams {
  /** 账户名 */
  account: string
  /** 密码 */
  password: string
}

/** 管理员登录：POST /api/admin/login，成功后返回长期 token + 短期 token */
export const adminLogin = (data: AdminLoginParams) => {
  return api.post<any, Result<TokenVO>>('/admin/login', data)
}

/**
 * 举报视图对象（对应后端 ReportVO extends ReportDTO）
 * 注意：后端雪花 id 超出 JS 安全整数范围时会被 json-bigint 转成字符串
 */
export interface ReportVO {
  /** 举报人 id */
  uId?: number | string | null
  /** 举报对象的内容 */
  report?: string | null
  /** 举报对象的 id */
  reportId?: number | string | null
  /** 所在对象的 id（具体的商品详情 id / 论坛 id 等） */
  objectId?: number | string | null
  /**
   * 所在对象的类型
   * 0 商品评论、1 商品、2 组团、3 组团发言、4 圈子动态、
   * 5 圈子动态评论、6 跑腿任务、7 跑腿任务评论、8 热门活动、9 热门活动评论
   */
  type?: number | null
  /** 举报原因 */
  reason?: string | null
  /** 后端未确定字段 */
  stay?: string | null
}

/** 管理员举报查询参数（对应后端 ItemQueryParam 的管理员查询部分） */
export interface AdminReportQuery {
  /** 举报类型（后端 ItemQueryParam.select，取值 0~9） */
  select: number
  /** 页码，默认 1 */
  pageNumber?: number
  /** 每页数量，默认 10 */
  pageSize?: number
  /** 开始时间 yyyy-MM-dd（可选） */
  beginTime?: string
  /** 结束时间 yyyy-MM-dd（可选） */
  endTime?: string
}

/**
 * 管理员查询举报：POST /api/admin/select/goods
 * 后端用 PageHelper 分页后直接返回 List<ReportVO>，不返回总数，
 * 因此调用方只能通过“本页条数是否等于 pageSize”判断是否还有下一页。
 */
export const selectReport = (data: AdminReportQuery) => {
  return api.post<any, Result<ReportVO[]>>('/admin/select/goods', data)
}

/** 封号时长单位（对应后端 java.util.concurrent.TimeUnit） */
export type BanTimeUnit = 'MINUTES' | 'HOURS' | 'DAYS'

/** 封号参数（对应后端 Ban；uId 由后端从登录态获取，无需传递） */
export interface BanParams {
  /** 封号时长 */
  time: number
  /** 时长单位 */
  unit: BanTimeUnit
  /** 详细原因 */
  cause: string
}

/** 封号：POST /api/admin/ban */
export const banUser = (data: BanParams) => {
  return api.post<any, Result<object>>('/admin/ban', data)
}
