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
import axios from 'axios'
// @ 是项目配置的路径别名，指向 src 目录
import router from '@/router'
// json-bigint：处理大整数精度问题（如 Java 后端返回的 Long 类型雪花 ID）
import JSONbig from 'json-bigint'

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

// ============================================================
// 请求拦截器（Request Interceptor）
// ============================================================
// 拦截器的作用：在请求发送前 "拦截" 下来，做一些预处理
// 这里主要做一件事：自动从 localStorage 或 sessionStorage 中取 Token，
// 并添加到请求头的 Authorization 字段中（Bearer 认证方式）
api.interceptors.request.use(
  // 第一个参数：成功回调 —— 修改完 config 后必须 return，请求才会继续发出
  function (config) {
    // 优先从 localStorage取；其次从 sessionStorage取
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
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
 * 统一处理 401 未授权状态
 * 触发场景：
 *   1. 用户未登录
 *   2. Token 已过期
 *   3. Token 无效
 *
 * 处理逻辑：
 *   清除本地存储的 Token，并跳转到登录页（避免重复跳转）
 */
function handleUnauthorized() {
  // 清除两个可能存储 Token 的位置
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
  // 防止死循环：如果当前已经在登录页，就不再跳转
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login' })
  }
}

// ============================================================
// 响应拦截器（Response Interceptor）
// ============================================================
// 拦截器的作用：在响应回来但还没交给调用方之前 "拦截" 下来，做统一处理
// 这里做两件事：
//   1. 成功响应：检查业务状态码，401 时跳转登录
//   2. 失败响应：检查 HTTP 状态码，401 时跳转登录
api.interceptors.response.use(
  // 第一个参数：成功回调（HTTP 状态码 2xx）
  // 这里仍然需要检查业务层面的 code，因为有些后端在 HTTP 200 的响应体里
  // 用 code: 401 来表示"未授权"
  function (response) {
    // 后端业务层返回的 code 为 401 时，视为未授权
    if (response.data?.code === 401) {
      handleUnauthorized()
      return Promise.reject(new Error('未登录或登录已过期'))
    }
    // 正常情况：直接返回 response.data，调用方拿到的就是业务数据，不用再 .data.data
    return response.data
  },
  // 第二个参数：失败回调（HTTP 状态码非 2xx，如 400、401、500 等）
  function (error) {
    const status = error.response?.status  // HTTP 状态码
    // 优先取后端返回的错误消息，其次取 Axios 的错误消息，最后给一个默认值
    const message = error.response?.data?.message || error.message || '请求失败'
    console.error('[API Error]', message)

    // HTTP 状态码 401（与业务层 401 呼应，双重保险）
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
