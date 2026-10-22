/**
 * 积分中心（转盘）相关接口
 *
 * 说明：
 * - 奖项文案与图片后续可由后端下发，接口就绪后调整 getWheelPrizes 即可。
 * - 抽奖结果由后端（/api/points/Raffle）决定，前端只负责按积分值停靠到对应扇区。
 */
import { isAxiosError } from 'axios'
import api from './index'
import type { Result } from './user'

/** 后端抽奖返回结构（对应 Java 的 Raffle 类） */
export interface Raffle {
  /** 描述文本：状态接口为「今天已经抽过奖了~」这类提示，抽奖接口为中奖文案 */
  text?: string
  /**
   * 积分数值：
   * - 状态接口（/points/check）：当前积分余额
   * - 抽奖接口（/points/Raffle）：本次中奖积分，前端据此匹配扇区
   */
  points: number
  /** 状态标记：状态接口为今天是否还能抽奖（false 表示已抽过），抽奖接口固定为 true */
  take?: boolean
}

/** 积分中心今日状态 */
export interface PointsStatus {
  /** 当前积分余额 */
  points: number | null
  /** 今天是否还能抽奖 */
  canDraw: boolean
  /** 后端提示文案，如「今天已经抽过奖了~」 */
  message: string
}

/**
 * 查询今日抽奖状态与积分余额
 * 后端接口：GET /api/points/check
 * 两种结果都走成功响应，且都带余额：
 * - 今天已抽过奖：Raffle(余额, take=false, text="今天已经抽过奖了~")
 * - 还能抽奖：Raffle(余额, take=true)
 */
export async function checkDrawStatus(): Promise<PointsStatus> {
  const result = await api.get<any, Result<Raffle>>('/points/check')

  if (result.code !== 1 || !result.data) {
    return { points: null, canDraw: false, message: result.msg || '今日抽奖状态查询失败' }
  }

  const { take, text, points } = result.data

  return {
    points: typeof points === 'number' ? points : null,
    canDraw: take !== false,
    message: text || '',
  }
}

/** 转盘奖项（奖项文案 + 对应图片由后端/配置传入） */
export interface WheelPrize {
  /** 奖项 id，与中奖的积分数值一致 */
  id: number | string
  /** 奖项文案 */
  name: string
  /** 奖项图片 URL（可选，未传时不显示图片） */
  image?: string
}

/**
 * 奖项分值：20~100 共 9 档（各占 11%），200 为 1% 大奖
 * 与后端 PointsServiceImpl#raffle 的奖项保持一致
 */
const REWARD_POINTS = [20, 30, 40, 50, 60, 70, 80, 90, 100, 200]

/**
 * 获取转盘奖项列表
 * TODO: 若后端提供奖项配置接口，改为从后端获取文案与图片
 */
export async function getWheelPrizes(): Promise<WheelPrize[]> {
  return REWARD_POINTS.map((points) => ({ id: points, name: `${points} 积分` }))
}

/**
 * 抽奖：结果由后端决定
 * 后端接口：GET /api/points/Raffle
 */
export async function drawWheel(): Promise<Raffle> {
  try {
    const result = await api.get<any, Result<Raffle>>('/points/Raffle')

    if (result.code !== 1 || !result.data) {
      throw new Error(result.msg || '抽奖失败，请稍后重试')
    }

    return result.data
  } catch (error) {
    // 后端异常（如「积分不足」）优先透出业务文案
    if (isAxiosError(error)) {
      const data = error.response?.data as { msg?: string; message?: string } | undefined
      throw new Error(data?.msg || data?.message || '抽奖失败，请稍后重试')
    }
    throw error
  }
}
