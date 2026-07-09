import api from './index'
import type { Result } from './user'

/** 用户反馈（与后端 UserFeedback 类对应） */
export interface UserFeedback {
  /** 反馈ID(主键) */
  feedbackId?: number
  /** 上传反馈的用户账号 */
  uploadAccount?: string
  /** 建议类型：1=提功能/体验建议，2=反馈故障 */
  suggestType?: number
  /** 建议/问题详细内容 */
  suggestContent?: string
  /** 出现问题的界面 */
  problemPage?: string
  /** 截图URL，多图逗号分隔 */
  screenshot?: string
  /** 反馈提交时间 */
  createTime?: string
  /** 处理状态：0待处理，1处理中，2已完结，3驳回 */
  handleStatus?: number
  /** 处理人员账号 */
  handlerAccount?: string
  /** 后台处理备注 */
  handleNote?: string
  /** 更新时间 */
  updateTime?: string
}

/** 用户反馈 */
export const addFeedback = (data: UserFeedback) => {
  return api.post<any, Result<null>>('/feedBack/add', data)
}
