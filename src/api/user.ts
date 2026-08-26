import api from './index'

export interface RegisterParams {
  username: string
  account: string
  password: string
}

export interface LoginParams {
  account: string
  password: string
}

export interface Result<T> {
  code: number
  msg: string
  data: T
}

/** 用户注册 */
export const register = (data: RegisterParams) => {
  return api.post<any, Result<string>>('/user/register', data)
}

/** 用户登录，返回 Result，data 为 JWT 令牌 */
export const login = (data: LoginParams) => {
  return api.post<any, Result<string>>('/user/login', data)
}

export interface UserInfo {
  id: number
  username: string
  account: string
}

export const getUserInfo = (id: number) => {
  return api.get<any, Result<UserInfo>>(`/user/info/${id}`)
}
