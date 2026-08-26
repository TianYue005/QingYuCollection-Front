export function isLoggedIn(): boolean {
  return !!localStorage.getItem('token') || !!sessionStorage.getItem('token')
}

export function getUsername(): string {
  return localStorage.getItem('username') || sessionStorage.getItem('username') || '游客'
}

export function getAccount(): string {
  return localStorage.getItem('account') || sessionStorage.getItem('account') || ''
}

export function setUserInfo(username: string, account: string) {
  const storage = localStorage.getItem('token') ? localStorage : sessionStorage
  storage.setItem('username', username)
  storage.setItem('account', account)
}

interface JwtPayload {
  sub?: unknown
  userId?: unknown
  id?: unknown
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload!.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export function getUserId(): number | null {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return null
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  const raw = payload.sub ?? payload.userId ?? payload.id
  if (raw == null) return null
  const num = Number(raw)
  return Number.isNaN(num) ? null : num
}
