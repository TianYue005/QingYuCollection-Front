import axios from 'axios'
import router from '@/router'
import JSONbig from 'json-bigint'  

const JSONParser = JSONbig({ storeAsString: true })

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  transformResponse: [
    (data) => {
      if (typeof data === 'string' && data.trim().length > 0) {
        try {
          return JSONParser.parse(data)
        } catch {
          return data
        }
      }
      return data
    },
  ],
})

// 请求拦截器
api.interceptors.request.use(
  function (config) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  function (error) {
    return Promise.reject(error)
  },
)

// 响应拦截器
api.interceptors.response.use(
  function (response) {
    return response.data
  },
  function (error) {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || '请求失败'
    console.error('[API Error]', message)

    // token 过期或未授权，清除登录态并跳转登录页
    if (status === 401) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      // 避免在登录页重复跳转
      if (router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login' })
      }
    }

    return Promise.reject(error)
  },
)

export default api
