/** 默认头像图片（public 目录下的静态资源，Vite 以 base 路径 / 访问） */
export const DEFAULT_AVATAR = '/DefaultAvator.png'

/** 后端未设置头像时返回的占位值 */
const DEFAULT_AVATAR_FLAG = '默认头像'

/**
 * 解析用户头像地址：
 * - 空值或后端占位值 "默认头像" 时，统一替换为默认头像图片
 * - 其余情况原样返回
 */
export const resolveAvatar = (avatar?: string | null) => {
  if (!avatar || avatar === DEFAULT_AVATAR_FLAG) return DEFAULT_AVATAR
  return avatar
}
