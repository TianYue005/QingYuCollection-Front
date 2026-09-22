/**
 * 全站统一的消息提示（对 Element Plus ElMessage 的封装）
 * ============================================================
 * 接口返回错误、表单提交成功等提示全部走这里，保证视觉完全一致：
 * - 形态取自 DESIGN.md 的 {component.search-input}：白底 canvas + hairline 描边 + pill 圆角；
 * - 不加投影（投影只留给产品图）；
 * - 文案用 DESIGN.md 的 {typography.body}：17px / 400 / 1.47 / -0.374px。
 * 具体样式见 src/assets/styles/global.css 中的 .app-message 段落。
 * ============================================================
 */
import { ElMessage } from 'element-plus'
import type { MessageHandler, MessageOptions } from 'element-plus'

/** 自定义类名：global.css 依靠它覆盖 Element Plus 的默认提示样式 */
const TOAST_CLASS = 'app-message'

/** 提示类型 */
type ToastType = 'success' | 'error' | 'warning' | 'info'

/** 调用方可覆盖的选项（message / type / customClass 由内部固定，避免样式被绕过） */
type ToastOptions = Omit<MessageOptions, 'message' | 'type' | 'customClass'>

function show(type: ToastType, content: string, options: ToastOptions = {}): MessageHandler {
  return ElMessage({
    message: content,
    type,
    customClass: TOAST_CLASS,
    ...options,
  })
}

/**
 * 统一提示入口：
 * - toast.success('发布成功')         → 提交成功
 * - toast.error('发布失败，请稍后重试') → 接口异常 / 后端返回错误
 * - toast.warning('请输入动态内容')    → 校验提醒
 */
export const toast = {
  success: (content: string, options?: ToastOptions) => show('success', content, options),
  error: (content: string, options?: ToastOptions) => show('error', content, options),
  warning: (content: string, options?: ToastOptions) => show('warning', content, options),
  info: (content: string, options?: ToastOptions) => show('info', content, options),
}
