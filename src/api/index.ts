/**
 * ============================================================
 * API 请求模块（基于 Axios 封装）
 * ============================================================
 * 本文件是整个项目 HTTP 请求的核心，统一管理请求的发送、拦截、错误处理。
 *
 * 核心概念：
 * - Axios：基于 Promise 的 HTTP 客户端，用于浏览器和 Node.js。
 * - 请求拦截器：在请求发出之前，统一处理请求头、参数等（如自动携带 Token）。
 * - 响应拦截器：在收到响应后，统一处理数据格式、错误码等（如自动跳转登录页）。
 * - JSONbig：解决 JavaScript 原生 Number 精度不足的问题（最大安全整数 2^53-1）。
 *   当后端返回大整数（如雪花 ID、金额分）时，转为字符串存储，避免精度丢失。
 */
import axios, { type InternalAxiosRequestConfig } from 'axios'
// @ 是项目配置的路径别名，指向 src 目录
import router from '@/router'
// json-bigint：处理大整数精度问题（如 Java 后端返回的 Long 类型雪花 ID）
import JSONbig from 'json-bigint'
import { clearTokens, getLongToken, getShortToken, saveShortToken } from '@/composables/useAuth'

/**
 * 创建一个 JSONbig 解析器实例
 * storeAsString: true —— 将超出 JS 安全范围的大数字转为字符串，避免精度丢失
 */
const JSONParser = JSONbig({ storeAsString: true })

/**
 * 创建 Axios 实例，并配置全局默认设置
 *
 * baseURL: 所有请求都会自动拼接 "/api" 前缀，例如：
 *   api.get('/user') 实际请求 → GET /api/user
 *
 * timeout: 请求超时时间 10 秒，超时后请求自动取消并抛出错误
 *
 * headers: 默认请求头，表示请求体的数据格式为 JSON
 *
 * transformResponse: 响应数据转换函数数组
 *   在响应拦截器的 then/catch 之前执行，用于对原始响应数据做预处理
 *   - 这里用来将后端返回的 JSON 字符串通过 JSONbig 解析，保护大整数精度
 *   - 如果解析失败（后端返回的不是合法 JSON），则原样返回
 */
const api = axios.create({
  baseURL: '/api',          // 请求基础路径，经过 Vite 代理转发到后端
  timeout: 10000,            // 超时时间（毫秒）
  headers: {
    'Content-Type': 'application/json', // 告诉后端：请求体是 JSON 格式
  },
  transformResponse: [
    (data) => {
      // 只处理非空字符串类型的响应数据
      if (typeof data === 'string' && data.trim().length > 0) {
        try {
          // 用 JSONbig 解析，保护大整数精度
          return JSONParser.parse(data)
        } catch {
          // 解析失败（如后端返回了纯文本），原样返回
          return data
        }
      }
      return data
    },
  ],
})

/**
 * 不需要携带短期 token 的接口：登录、注册
 * 其余接口一律使用短期 token
 */
const AUTH_FREE_URLS = ['/user/login', '/user/register']

/** 用长期 token 换取新的短期 token 的接口 */
const REFRESH_TOKEN_URL = '/user/LongTime2ShortTerm'

function isAuthFree(url?: string): boolean {
  return !!url && AUTH_FREE_URLS.some((path) => url.includes(path))
}

/** 携带重试标记的请求配置，避免 401 后无限重试 */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// ============================================================
// 请求拦截器（Request Interceptor）
// ============================================================
// 在请求发送前自动携带短期 token（登录、注册除外）
api.interceptors.request.use(
  // 第一个参数：成功回调 —— 修改完 config 后必须 return，请求才会继续发出
  function (config) {
    if (isAuthFree(config.url)) {
      return config
    }
    // 只使用短期 token，长期 token 不参与业务请求
    const token = getShortToken()
    if (token) {
      // Bearer Token 是一种标准的认证方式："Bearer " + token
      config.headers.Authorization = `Bearer ${token}`
    }
    return config // 必须返回 config，否则请求无法发出
  },
  // 第二个参数：失败回调 —— 请求还没发出就出错了（如网络配置错误）
  function (error) {
    return Promise.reject(error) // 让调用方可以 .catch() 捕获
  },
)

/**
 * 用长期 token 换取新的短期 token。
 * 这里直接用未封装的 axios，避免再次进入拦截器造成递归。
 */
async function requestNewShortToken(): Promise<string> {
  const longToken = getLongToken()
  if (!longToken) {
    throw new Error('缺少长期 token，无法续期')
  }
  const response = await axios.get<{ code?: number; msg?: string; data?: string }>(
    `/api${REFRESH_TOKEN_URL}`,
    { params: { token: longToken }, timeout: 10000 },
  )
  const body = response.data
  const newToken = body?.data
  if (body?.code !== 1 || !newToken) {
    throw new Error(body?.msg || '换取短期 token 失败')
  }
  saveShortToken(newToken)
  return newToken
}

/** 并发出现多个 401 时只发起一次续期请求，其余请求复用同一个 Promise */
let refreshing: Promise<string> | null = null

function refreshShortToken(): Promise<string> {
  if (!refreshing) {
    refreshing = requestNewShortToken().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

/** 用新的短期 token 重放原请求；已重试过或没有长期 token 时直接失败 */
async function retryWithNewShortToken(config: RetriableConfig) {
  if (config._retried || !getLongToken()) {
    throw new Error('无法刷新登录状态')
  }
  const token = await refreshShortToken()
  config._retried = true
  config.headers.Authorization = `Bearer ${token}`
  return api(config)
}

/**
 * 统一处理登录失效（无法用长期 token 换到新的短期 token）
 * 处理逻辑：清除本地 token，并跳转到登录页（避免重复跳转）
 * 管理员页面（/admin/**）失效时回到管理员登录页，其余回到用户登录页
 */
function handleUnauthorized() {
  clearTokens()
  const current = router.currentRoute.value
  const isAdminPage = current.path.startsWith('/admin')
  const targetName = isAdminPage ? 'adminLogin' : 'login'
  // 防止死循环：如果当前已经在对应登录页，就不再跳转
  if (current.name !== targetName) {
    router.push({ name: targetName })
  }
}

/** 供非 axios 请求（如 AI 客服的 fetch 流）复用：续期失败则退出登录 */
export async function refreshShortTokenOrLogout(): Promise<string> {
  try {
    return await refreshShortToken()
  } catch (error) {
    handleUnauthorized()
    throw error
  }
}

// ============================================================
// 响应拦截器（Response Interceptor）
// ============================================================
// 处理逻辑：
//   1. 收到 401 时，先用长期 token 换取新的短期 token，成功则重放原请求
//   2. 换不到新 token 或重放后仍然 401，则清除登录态并跳转登录页
api.interceptors.response.use(
  // 第一个参数：成功回调（HTTP 状态码 2xx）
  // 有些后端会在 HTTP 200 的响应体里用 code: 401 表示"未授权"
  async function (response) {
    if (response.data?.code === 401) {
      const config = response.config as RetriableConfig
      if (!isAuthFree(config?.url)) {
        try {
          return await retryWithNewShortToken(config)
        } catch {
          // 换不到新的短期 token，走下面的退出登录
        }
      }
      handleUnauthorized()
      return Promise.reject(new Error('未登录或登录已过期'))
    }
    // 正常情况：直接返回 response.data，调用方拿到的就是业务数据，不用再 .data.data
    return response.data
  },
  // 第二个参数：失败回调（HTTP 状态码非 2xx，如 400、401、500 等）
  async function (error) {
    const status = error.response?.status // HTTP 状态码
    // 优先取后端返回的错误消息，其次取 Axios 的错误消息，最后给一个默认值
    const message =
      error.response?.data?.msg || error.response?.data?.message || error.message || '请求失败'
    console.error('[API Error]', message)

    const config = error.config as RetriableConfig | undefined
    // HTTP 401：先用长期 token 续期并重放请求
    if (status === 401 && config && !isAuthFree(config.url)) {
      try {
        return await retryWithNewShortToken(config)
      } catch {
        // 续期或重放失败，走下面的退出登录
      }
    }
    if (status === 401) {
      handleUnauthorized()
    }

    return Promise.reject(error) // 让调用方可以 .catch() 捕获并处理
  },
)

/**
 * 导出封装好的 Axios 实例，供其他模块使用
 *
 * 使用示例：
 *   import api from '@/api'
 *   api.get('/user/info').then(res => { console.log(res) })
 *   api.post('/user/login', { username: 'admin', password: '123' })
 */
export default api
