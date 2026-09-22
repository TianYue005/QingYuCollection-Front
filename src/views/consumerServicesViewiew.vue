<template>
  <NavBanner />
  <div class="service-page">
    <div class="service-card">
      <!-- 客服头部：头像 / 标题 / 连接状态 -->
      <header class="service-header">
        <div class="service-avatar">
          <img src="@/assets/picture/logo.svg" alt="AI 客服" />
        </div>
        <div class="service-meta">
          <h1 class="service-title">AI 客服</h1>
          <p class="service-status">
            <span class="status-dot" :class="{ 'is-busy': streaming }"></span>
            {{ streaming ? '正在输入…' : '在线，随时为你解答' }}
          </p>
        </div>
      </header>

      <!-- 消息区 -->
      <div ref="listRef" class="message-list">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="bubble-row"
          :class="{ 'is-self': msg.role === 'user' }"
        >
          <div class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
            <span v-if="msg.content" class="bubble-text">{{ msg.content }}</span>
            <span v-else-if="isLastStreaming(index)" class="typing-dots">
              <i></i><i></i><i></i>
            </span>
            <!-- 流式输出中的光标，跟随最后一段增量闪烁 -->
            <span v-if="msg.content && isLastStreaming(index)" class="typing-caret"></span>
          </div>
        </div>

        <!-- 快捷提问：仅在还没开始提问时展示 -->
        <div v-if="showSuggestions" class="suggestion-list">
          <button
            v-for="question in suggestions"
            :key="question"
            class="suggestion-chip"
            :disabled="streaming"
            @click="submit(question)"
          >
            {{ question }}
          </button>
        </div>
      </div>

      <!-- 输入区 -->
      <footer class="input-bar">
        <textarea
          v-model="inputText"
          class="input-box"
          rows="3"
          placeholder="请输入你的问题，Enter 发送，Shift + Enter 换行"
          @keydown="handleKeydown"
        ></textarea>
        <button v-if="streaming" class="action-btn stop-btn" @click="stopStreaming">停止生成</button>
        <button
          v-else
          class="action-btn send-btn"
          :disabled="!inputText.trim()"
          @click="handleSend"
        >
          发送
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import NavBanner from '@/components/NavBanner.vue'
import { streamAiChat, type AiChatMessage } from '@/api/ai'

/**
 * true：用本地模拟的流式回复预览界面（后端未启动时使用）；
 * false：请求真实后端 SSE 接口（GET /api/customer/service/connect，见 src/api/ai.ts）。
 */
const USE_MOCK = false

/** 开场白（前端本地文案，不参与发给后端的上下文） */
function createWelcome(): AiChatMessage {
  return {
    role: 'assistant',
    content: '你好，我是青寓集的 AI 客服，有什么可以帮你的吗？\n你可以问我关于商品发布、交易流程、账号登录等问题。',
  }
}

/** 快捷提问 */
const suggestions = [
  '怎么发布二手商品？',
  '交易流程是怎样的？',
  '忘记密码怎么办？',
  '怎么联系卖家？',
]

const messages = ref<AiChatMessage[]>([createWelcome()])
const inputText = ref('')
/** 是否正在接收 AI 回复（流式输出中） */
const streaming = ref(false)
const listRef = ref<HTMLElement | null>(null)
/** 当前流的中断控制器，用户点"停止生成"或页面卸载时 abort */
let controller: AbortController | null = null

const showSuggestions = computed(() => messages.value.length <= 1)

/** 是否是正在流式输出中的最后一条 AI 消息 */
function isLastStreaming(index: number): boolean {
  return streaming.value && index === messages.value.length - 1 && messages.value[index]?.role === 'assistant'
}

/** 距底部多少像素内算"贴底"：贴底时自动跟随新内容，用户上翻查看历史时则不打断 */
const STICK_BOTTOM_GAP = 80

function isNearBottom(): boolean {
  const el = listRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < STICK_BOTTOM_GAP
}

function scrollToBottom(force = false) {
  const stick = isNearBottom()
  nextTick(() => {
    const el = listRef.value
    if (el && (force || stick)) el.scrollTop = el.scrollHeight
  })
}

/** 把增量文本追加到末尾的 AI 气泡上 */
function appendAssistantDelta(text: string) {
  if (!text) return
  const stick = isNearBottom()
  const last = messages.value[messages.value.length - 1]
  if (!last || last.role !== 'assistant') return
  last.content += text
  if (stick) scrollToBottom(true)
}

// ============================================================
// 本地模拟流式回复（USE_MOCK 为 true 时使用）
// ============================================================
let mockTimer: ReturnType<typeof setTimeout> | null = null

/** 按关键词返回一段模拟答案，让界面预览更接近真实对话 */
function mockReply(question: string): string {
  if (question.includes('发布')) {
    return '发布二手商品很简单：\n1. 登录后点击右侧的「发闲置」按钮；\n2. 上传商品图片，填写标题、描述、价格和交易地点；\n3. 确认无误后提交，商品就会出现在校园市集里。\n如果发布后想修改，可以到「我的 - 我卖出的」里编辑。'
  }
  if (question.includes('交易')) {
    return '交易流程分为三步：\n1. 在商品详情页点击「聊一聊」与卖家沟通；\n2. 确认后点击「购买」发起交易请求，等待卖家在聊天中接受；\n3. 双方按约定当面或线下完成交易，并在「我的 - 待处理」中确认完成。\n线下交易时请尽量选择校内公共场所，注意安全。'
  }
  if (question.includes('密码') || question.includes('登录')) {
    return '如果忘记密码，可以在登录页点击「找回密码」，通过注册时绑定的手机号或邮箱重置。\n如果账号被锁定或收不到验证码，请把账号信息、出现问题的时间发到反馈中心，我们会在 1 个工作日内处理。'
  }
  if (question.includes('联系') || question.includes('卖家')) {
    return '在商品详情页点击「聊一聊」即可进入与卖家的私聊，也可以到「消息」列表里找到历史会话继续沟通。\n沟通过程中请勿提前转账，建议当面验货后再付款。'
  }
  return '收到你的问题啦。\n目前我还在学习中，关于商品发布、交易流程、账号登录、联系卖家这几类问题我可以直接解答；\n其他问题你可以描述得更具体一些，或者通过页面右侧的「反馈」入口提交给人工客服。'
}

/** 模拟 SSE：把预置答案按字符分批推入气泡，返回的 Promise 在推完或中断后 resolve */
function startMockStream(question: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const full = mockReply(question)
    let index = 0
    const cleanup = () => {
      if (mockTimer) {
        clearTimeout(mockTimer)
        mockTimer = null
      }
    }
    const step = () => {
      if (signal.aborted) {
        cleanup()
        resolve()
        return
      }
      appendAssistantDelta(full.slice(index, index + 2))
      index += 2
      if (index >= full.length) {
        cleanup()
        resolve()
        return
      }
      mockTimer = setTimeout(step, 24)
    }
    step()
  })
}

/**
 * 发送一条提问：先把用户消息与空的 AI 气泡推入列表，再流式填充 AI 回复。
 * 空气泡在流结束后仍无内容时，兜底显示错误/重试文案，避免留下空气泡。
 */
async function submit(question: string) {
  if (streaming.value) return
  const text = question.trim()
  if (!text) return

  messages.value.push({ role: 'user', content: text })
  messages.value.push({ role: 'assistant', content: '' })
  scrollToBottom(true)
  streaming.value = true

  controller = new AbortController()
  const signal = controller.signal
  let errorText = ''

  try {
    if (USE_MOCK) {
      await startMockStream(text, signal)
    } else {
      // 多轮上下文由后端 ChatMemory 维护，这里只发当前这一句
      await streamAiChat(text, {
        signal,
        onDelta: appendAssistantDelta,
        onError: (error) => {
          errorText = error.message
        },
      })
    }
  } finally {
    streaming.value = false
    controller = null
    const last = messages.value[messages.value.length - 1]
    if (last && last.role === 'assistant' && !last.content) {
      last.content = errorText || '抱歉，客服暂时无法回答，请稍后再试。'
    }
    scrollToBottom(true)
  }
}

function handleSend() {
  if (streaming.value) return
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  void submit(text)
}

/** Enter 发送、Shift + Enter 换行；中文输入法候选未结束（isComposing）时不触发发送 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  handleSend()
}

/** 仅中断当前流，已生成的内容保留 */
function stopStreaming() {
  controller?.abort()
}

onUnmounted(() => {
  controller?.abort()
  if (mockTimer) {
    clearTimeout(mockTimer)
    mockTimer = null
  }
})
</script>

<style scoped>
/* ===== 页面主体 ===== */
.service-page {
  height: calc(100vh - 64px);
  padding: 24px;
  background: #f5f5f7;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}

.service-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1080px;
  height: 100%;
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
}

/* ===== 头部 ===== */
.service-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.service-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f7;
  border-radius: 50%;
}

.service-avatar img {
  width: 26px;
  height: 26px;
  display: block;
}

.service-meta {
  flex: 1;
  min-width: 0;
}

.service-title {
  margin: 0;
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.24;
  color: #1d1d1f;
}

.service-status {
  margin: 2px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: #7a7a7a;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34c759;
}

.status-dot.is-busy {
  background: #ff9f0a;
}

/* ===== 消息区 ===== */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-thumb {
  background: #c1c1c6;
  border-radius: 3px;
}

.bubble-row {
  display: flex;
}

.bubble-row.is-self {
  justify-content: flex-end;
}

.bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 18px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  line-height: 1.47;
  word-break: break-word;
}

.bubble-ai {
  background: #e9e9eb;
  color: #1d1d1f;
  border-bottom-left-radius: 4px;
}

.bubble-user {
  background: #0066cc;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

/* 保留 AI 回复中的换行与空格 */
.bubble-text {
  white-space: pre-wrap;
}

/* 等待首段增量时的三点动画 */
.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
}

.typing-dots i {
  width: 6px;
  height: 6px;
  background: #8e8e93;
  border-radius: 50%;
  animation: typing-bounce 1.2s infinite ease-in-out;
}

.typing-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* 流式输出光标 */
.typing-caret {
  display: inline-block;
  width: 2px;
  height: 15px;
  margin-left: 2px;
  vertical-align: -2px;
  background: #0066cc;
  animation: caret-blink 1s steps(1) infinite;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}

/* ===== 快捷提问 ===== */
.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  padding-left: 4px;
}

.suggestion-chip {
  padding: 8px 16px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  color: #0066cc;
  background: #ffffff;
  border: 1px solid #d2d2d7;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.suggestion-chip:hover:enabled {
  background: #f5f5f7;
  border-color: #0066cc;
}

.suggestion-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 输入区 ===== */
.input-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

.input-box {
  flex: 1;
  min-height: 132px;
  max-height: 360px;
  padding: 9px 16px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  line-height: 1.47;
  color: #1d1d1f;
  background: #f5f5f7;
  border: 1px solid #e5e5ea;
  border-radius: 20px;
  resize: none;
  outline: none;
  box-sizing: border-box;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.input-box::placeholder {
  color: #8e8e93;
}

.input-box:focus {
  background: #ffffff;
  border-color: #0066cc;
}

.action-btn {
  flex-shrink: 0;
  height: 40px;
  padding: 0 24px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #ffffff;
  background: #0066cc;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
}

.action-btn:hover:enabled {
  background: #0071e3;
}

.action-btn:active:enabled {
  transform: scale(0.97);
}

.action-btn:disabled {
  background: #a0c4e8;
  cursor: not-allowed;
}

.stop-btn {
  color: #1d1d1f;
  background: #e9e9eb;
}

.stop-btn:hover:enabled {
  background: #dcdce0;
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .service-page {
    padding: 0;
    height: calc(100vh - 64px);
  }

  .service-card {
    border-radius: 0;
  }

  .message-list,
  .input-bar,
  .service-header {
    padding-left: 17px;
    padding-right: 17px;
  }
}
</style>
