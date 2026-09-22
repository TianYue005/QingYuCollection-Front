/**
 * ============================================================
 * AI 客服接口（SSE 流式对话）
 * ============================================================
 * 与后端约定（AiCustomerServiceController）：
 *   请求：GET /api/customer/service/connect?message=<用户提问>
 *         Header: Authorization: Bearer <token>（前端自动携带，未登录则不传）
 *   响应：Content-Type: text/event-stream，每个元素被 Spring 写成一条 SSE 事件
 *           data: 增量文本
 *           data: 增量文本
 *           data: [DONE]                ← 若后端补了结束标记则识别，没有也不影响（流结束即完成）
 *   多轮上下文由后端 MessageChatMemoryAdvisor 维护，前端每次只发当前这一句。
 *
 * 为什么不用浏览器原生 EventSource：
 *   EventSource 无法自定义请求头（带不了 Authorization），所以这里用 fetch + ReadableStream
 *   手动解析 SSE，既能带鉴权头，又能随时 abort 中断。
 */

/** 对话消息（role 区分用户 / AI） */
export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** 流式对话地址（fetch 不走 axios 实例，需要自己带 /api 前缀） */
export const AI_CHAT_STREAM_URL = '/api/customer/service/connect'

/** 结束标记：后端若推送 [DONE] 则提前结束，未推送时以流关闭为结束信号 */
const DONE_FLAG = '[DONE]'

function readToken(): string {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}

/**
 * 解析一条 SSE 事件，返回其中的 data 文本；注释行（":" 开头的心跳）与 event / id / retry 字段忽略。
 *
 * 注意：Spring 把 Flux<String> 的每个元素直接写进 data 字段，若模型输出本身带换行，
 * 事件里会出现不带 "data:" 前缀的裸行（严格按 SSE 规范应被忽略，会导致回答被截断）。
 * 因此这里在已出现过 data 字段时，把这类无字段名的行按"data 内容的续行"处理，保证多行回答完整。
 */
function parseEventData(rawEvent: string): string | null {
  const dataLines: string[] = []
  let hasData = false
  for (const line of rawEvent.split(/\r?\n/)) {
    if (line.startsWith(':')) continue // 注释行（心跳），无内容
    if (line.startsWith('data:')) {
      // 规范规定 "data:" 后可有一个可选空格，需去掉
      dataLines.push(line.slice(5).replace(/^ /, ''))
      hasData = true
      continue
    }
    if (/^(event|id|retry):/.test(line)) continue
    if (hasData && line.length > 0) dataLines.push(line)
  }
  return hasData ? dataLines.join('\n') : null
}

/** 把后端推送的内容统一成纯文本：兼容纯文本与 {"content":"..."} / {"delta":"..."} 两种 JSON 增量 */
function normalizeChunk(data: string): string {
  const trimmed = data.trim()
  if (!trimmed.startsWith('{')) return data
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>
    const value = obj.content ?? obj.delta ?? obj.text
    return typeof value === 'string' ? value : ''
  } catch {
    return data
  }
}

export interface StreamChatOptions {
  /** 外部中断信号（用户点"停止生成"或页面卸载时 abort） */
  signal?: AbortSignal
  /** 每收到一段增量文本调用一次 */
  onDelta: (text: string) => void
  /** 流正常结束（含用户主动中断）时调用 */
  onDone?: () => void
  /** 请求失败或流异常时调用 */
  onError?: (error: Error) => void
}

/**
 * 发起流式对话，边收边通过 onDelta 回调吐出文本增量。
 * 多轮上下文由后端 ChatMemory 维护，这里只需传本次的提问文本。
 * 本函数不抛异常：错误统一交给 onError，调用方无需 try/catch。
 */
export async function streamAiChat(message: string, options: StreamChatOptions): Promise<void> {
  const { signal, onDelta, onDone, onError } = options
  try {
    const token = readToken()
    const response = await fetch(`${AI_CHAT_STREAM_URL}?message=${encodeURIComponent(message)}`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    })

    if (response.status === 401) throw new Error('登录已过期，请重新登录后再试')
    if (!response.ok) throw new Error(`AI 客服响应异常（${response.status}）`)
    if (!response.body) throw new Error('当前浏览器不支持流式响应')

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let finished = false

    // 逐块读取：SSE 以空行分隔事件，最后一段可能被截断，先留在 buffer 等下一块
    while (!finished) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() ?? ''
      for (const event of events) {
        const data = parseEventData(event)
        if (data == null) continue
        if (data.trim() === DONE_FLAG) {
          finished = true
          break
        }
        onDelta(normalizeChunk(data))
      }
    }

    // 流已结束，但 buffer 里可能还剩一条没有以空行收尾的事件
    if (!finished && buffer.trim()) {
      const data = parseEventData(buffer)
      if (data != null && data.trim() !== DONE_FLAG) onDelta(normalizeChunk(data))
    }

    onDone?.()
  } catch (error) {
    // 用户主动中断（点"停止生成"）不算错误，按正常结束处理
    if (error instanceof Error && error.name === 'AbortError') {
      onDone?.()
      return
    }
    onError?.(error instanceof Error ? error : new Error('AI 客服连接失败'))
  }
}
