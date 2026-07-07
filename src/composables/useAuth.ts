import { useRouter } from 'vue-router'

/** 检查是否已登录（是否存在 token） */
export function isLoggedIn(): boolean {
  return !!localStorage.getItem('token')
}

/**
 * 用户头像/名称点击处理
 * 未登录时跳转到登录页，已登录时返回 true 供调用方执行后续逻辑
 */
export function useAuth() {
  const router = useRouter()

  function handleUserClick(): boolean {
    if (!isLoggedIn()) {
      router.push({ name: 'login' })
      return false
    }
    return true
  }

  return { handleUserClick, isLoggedIn }
}
