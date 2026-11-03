/**
 * 短期 token：所有业务请求（除登录、注册）都使用它
 */
export const SHORT_TOKEN_KEY = 'token'
/**
 * 长期 token：不参与业务请求，仅在短期 token 失效时用来换取新的短期 token
 */
export const LONG_TOKEN_KEY = 'longToken'

/** 浏览器端两处存储，登录态可能在其中任意一处 */
function tokenStorages(): Storage[] {
  return [localStorage, sessionStorage]
}

/** 读取短期 token（localStorage 优先） */
export function getShortToken(): string | null {
  return localStorage.getItem(SHORT_TOKEN_KEY) || sessionStorage.getItem(SHORT_TOKEN_KEY)
}

/** 读取长期 token（localStorage 优先） */
export function getLongToken(): string | null {
  return localStorage.getItem(LONG_TOKEN_KEY) || sessionStorage.getItem(LONG_TOKEN_KEY)
}

/** 清除两处存储中的短期、长期 token */
export function clearTokens() {
  tokenStorages().forEach((storage) => {
    storage.removeItem(SHORT_TOKEN_KEY)
    storage.removeItem(LONG_TOKEN_KEY)
  })
}

/**
 * 登录成功后保存 token。
 * 先清空两处存储，避免上一次"记住我"留下的旧 token 残留，
 * 导致读取时优先级错乱（例如本次未勾选记住我，却读到了旧的 localStorage token）。
 */
export function saveTokens(shortToken: string, longToken: string, remember: boolean) {
  clearTokens()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(SHORT_TOKEN_KEY, shortToken)
  if (longToken) storage.setItem(LONG_TOKEN_KEY, longToken)
}

/** 换取到新的短期 token 后写回（写在持有长期 token 的那一侧） */
export function saveShortToken(shortToken: string) {
  const storage = localStorage.getItem(LONG_TOKEN_KEY) ? localStorage : sessionStorage
  const other = storage === localStorage ? sessionStorage : localStorage
  storage.setItem(SHORT_TOKEN_KEY, shortToken)
  other.removeItem(SHORT_TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return !!getShortToken()
}

export function getUsername(): string {
  return localStorage.getItem('username') || sessionStorage.getItem('username') || '游客'
}

export function getAccount(): string {
  return localStorage.getItem('account') || sessionStorage.getItem('account') || ''
}

export function setUserInfo(username: string, account: string) {
  const storage = getShortToken() ? localStorage : sessionStorage
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
  const token = getShortToken()
  if (!token) return null
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  const raw = payload.sub ?? payload.userId ?? payload.id
  if (raw == null) return null
  const num = Number(raw)
  return Number.isNaN(num) ? null : num
}
