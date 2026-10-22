<template>
    <div class="points-page">
        <section class="points-hero">
            <h1 class="hero-title">积分中心</h1>
            <p class="hero-tagline">签到赚积分，好礼等你拿</p>

            <div class="points-balance">
                <span class="balance-label">我的积分</span>
                <span class="balance-value">{{ balance ?? '--' }}</span>
            </div>
        </section>

        <section class="points-body">
            <div class="wheel-card">
                <div class="wheel-heading">
                    <h2 class="wheel-title">今日好运</h2>
                    <p class="wheel-subtitle">
                        {{ statusLoaded && !canDraw ? '今天已经抽过奖了，明天再来吧' : '每天可抽 1 次，点击中间按钮转动好运' }}
                    </p>
                </div>

                <div v-if="prizes.length" class="wheel-stage">
                    <div class="wheel-pointer" aria-hidden="true"></div>

                    <div class="wheel" :style="wheelStyle">
                        <div class="wheel-face" :style="{ background: wheelGradient }"></div>
                        <div
                            v-for="(prize, index) in prizes"
                            :key="prize.id"
                            class="wheel-label"
                            :style="{ transform: `rotate(${(index + 0.5) * SEGMENT}deg)` }"
                        >
                            <img
                                v-if="prize.image"
                                class="wheel-label-image"
                                :src="prize.image"
                                :alt="prize.name"
                            />
                            <span class="wheel-label-text" :style="{ color: textColor(index) }">
                                {{ prize.name }}
                            </span>
                        </div>
                    </div>

                    <button
                        class="wheel-button"
                        type="button"
                        :disabled="spinning || !statusLoaded || !canDraw"
                        @click="spin"
                    >
                        {{ buttonText }}
                    </button>
                </div>

                <p v-else class="wheel-loading">转盘加载中…</p>

                <p class="wheel-result" :class="{ 'is-visible': hint }">
                    {{ hint || ' ' }}
                </p>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { checkDrawStatus, drawWheel, getWheelPrizes } from '@/api/points'
import type { Raffle, WheelPrize } from '@/api/points'
import { toast } from '@/utils/message'

/** 扇区配色（按奖项顺序循环使用） */
const SECTOR_COLORS = [
    { background: '#FFD60A', text: '#1d1d1f' },
    { background: '#FF9F0A', text: '#ffffff' },
    { background: '#FF6482', text: '#ffffff' },
    { background: '#BF5AF2', text: '#ffffff' },
    { background: '#5E5CE6', text: '#ffffff' },
    { background: '#0A84FF', text: '#ffffff' },
    { background: '#30D158', text: '#1d1d1f' },
    { background: '#FF375F', text: '#ffffff' },
]

/** 等待后端结果时的匀速转速（度/秒） */
const SPIN_SPEED = 600
/** 停靠时额外多转的圈数 */
const STOP_TURNS = 3
/** 减速停靠时长（毫秒） */
const STOP_DURATION = 2200
/** 最短旋转时长（毫秒），避免接口秒回时转盘刚转就停 */
const MIN_SPIN_TIME = 1200

const prizes = ref<WheelPrize[]>([])
const rotation = ref(0)
const spinning = ref(false)
const result = ref('')
/** 当前积分余额（后端在今日已抽奖时不返回，保持 null 显示 --） */
const balance = ref<number | null>(null)
/** 今日是否还能抽奖 */
const canDraw = ref(true)
/** 状态接口是否已返回，未返回前禁用抽奖按钮，避免重复抽奖 */
const statusLoaded = ref(false)
/** 后端返回的状态提示文案，如「今天已经抽过奖了~」 */
const statusText = ref('')

const buttonText = computed(() => {
    if (spinning.value) return '抽奖中'
    if (!statusLoaded.value) return '加载中'
    return canDraw.value ? '抽奖' : '明天再来'
})

/** 结果文案优先展示中奖结果，其次展示不可抽奖的原因（旋转过程中不展示） */
const hint = computed(() => {
    if (result.value) return result.value
    return !spinning.value && !canDraw.value ? statusText.value : ''
})

const SEGMENT = computed(() => (prizes.value.length ? 360 / prizes.value.length : 0))

const wheelStyle = computed(() => ({ transform: `rotate(${rotation.value}deg)` }))

const wheelGradient = computed(() => {
    if (!prizes.value.length) return 'none'

    const segment = SEGMENT.value
    const stops = prizes.value.map((_, index) => {
        const color = SECTOR_COLORS[index % SECTOR_COLORS.length]!.background
        return `${color} ${index * segment}deg ${(index + 1) * segment}deg`
    })
    return `conic-gradient(from 0deg, ${stops.join(', ')})`
})

const textColor = (index: number) => SECTOR_COLORS[index % SECTOR_COLORS.length]!.text

type SpinMode = 'idle' | 'waiting' | 'stopping'

let mode: SpinMode = 'idle'
let rafId = 0
let lastFrame = 0
let spinStartAt = 0
let stopFrom = 0
let stopTo = 0
let stopStartAt = 0
let pendingIndex = 0
let pendingText = ''

function tick(now: number) {
    const elapsed = Math.min((now - lastFrame) / 1000, 0.1)
    lastFrame = now

    if (mode === 'waiting') {
        rotation.value += SPIN_SPEED * elapsed
        rafId = requestAnimationFrame(tick)
        return
    }

    if (mode === 'stopping') {
        const progress = Math.min((now - stopStartAt) / STOP_DURATION, 1)
        const eased = 1 - (1 - progress) ** 3
        rotation.value = stopFrom + (stopTo - stopFrom) * eased

        if (progress < 1) {
            rafId = requestAnimationFrame(tick)
            return
        }

        mode = 'idle'
        spinning.value = false
        result.value = pendingText
    }
}

async function spin() {
    if (spinning.value || !canDraw.value || !prizes.value.length) return

    spinning.value = true
    result.value = ''
    spinStartAt = performance.now()
    mode = 'waiting'
    lastFrame = spinStartAt
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(tick)

    try {
        // 结果由后端决定，返回前转盘持续旋转
        const drawResult = await drawWheel()

        // 抽奖成功后当天不能再抽，并同步累加积分余额
        canDraw.value = false
        statusText.value = drawResult.text || '今天已经抽过奖了~'
        const wonPoints = Number(drawResult.points) || 0
        if (balance.value !== null) balance.value += wonPoints

        const remain = MIN_SPIN_TIME - (performance.now() - spinStartAt)
        if (remain > 0) await new Promise((resolve) => setTimeout(resolve, remain))

        beginStop(drawResult)
    } catch (error) {
        cancelAnimationFrame(rafId)
        mode = 'idle'
        spinning.value = false
        const message = error instanceof Error && error.message ? error.message : '抽奖失败，请稍后重试'
        // 页面状态过期（如其他端已抽过）时，同步为不可抽奖
        if (message.includes('抽过')) {
            canDraw.value = false
            statusText.value = message
        }
        console.error('[抽奖失败]', error)
        toast.error(message)
    }
}

function beginStop(drawResult: Raffle) {
    pendingIndex = findPrizeIndex(drawResult)
    pendingText = drawResult.text || `恭喜获得 ${drawResult.points} 积分`

    const segment = SEGMENT.value
    // 指针在正上方：让命中扇区的中心转到 0 度位置
    const targetAngle = (pendingIndex + 0.5) * segment
    const targetMod = ((360 - targetAngle) % 360 + 360) % 360
    const currentMod = ((rotation.value % 360) + 360) % 360
    const delta = (targetMod - currentMod + 360) % 360

    stopFrom = rotation.value
    stopTo = rotation.value + STOP_TURNS * 360 + delta
    stopStartAt = performance.now()
    lastFrame = stopStartAt
    mode = 'stopping'
}

/** 按后端返回的积分数值匹配扇区 */
function findPrizeIndex(drawResult: Raffle) {
    const byPoints = prizes.value.findIndex(
        (prize) => String(prize.id) === String(drawResult.points),
    )
    return byPoints === -1 ? 0 : byPoints
}

/** 拉取今日抽奖状态与积分余额 */
async function loadStatus() {
    try {
        const status = await checkDrawStatus()
        balance.value = status.points
        canDraw.value = status.canDraw
        statusText.value = status.message
    } catch (error) {
        // 状态查询失败时不阻塞抽奖，后端在抽奖时会再次校验
        console.error('[积分状态加载失败]', error)
        toast.error('积分状态加载失败，请稍后重试')
    } finally {
        statusLoaded.value = true
    }
}

onMounted(async () => {
    try {
        // 奖项文案与图片后续由后端下发
        prizes.value = await getWheelPrizes()
    } catch (error) {
        console.error('[转盘奖项加载失败]', error)
        toast.error('转盘加载失败，请稍后重试')
    }

    await loadStatus()
})

onBeforeUnmount(() => cancelAnimationFrame(rafId))
</script>

<style scoped>
/* ===== CSS Variables (Apple Design Tokens) ===== */
:root {
    --color-ink: #1d1d1f;
    --color-canvas: #ffffff;
    --color-canvas-parchment: #f5f5f7;
    --color-body-muted: #86868b;

    --font-display: 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    --font-text: 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

    --spacing-section: 80px;
    --spacing-xl: 32px;
    --spacing-lg: 24px;
    --spacing-sm: 12px;
}

/* ===== Page Base ===== */
.points-page {
    background-color: var(--color-canvas-parchment);
    min-height: 100vh;
}

/* ===== Hero Section ===== */
.points-hero {
    background-color: var(--color-canvas);
    text-align: center;
    padding: var(--spacing-section) var(--spacing-lg) var(--spacing-xl);
}

.hero-title {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.28px;
    color: var(--color-ink);
    margin: 0 0 var(--spacing-sm);
}

.hero-tagline {
    font-family: var(--font-text);
    font-size: 21px;
    font-weight: 400;
    line-height: 1.3;
    letter-spacing: 0.231px;
    color: var(--color-body-muted);
    margin: 0;
}

/* ===== 积分余额 ===== */
.points-balance {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    margin-top: var(--spacing-lg);
    padding: 8px 20px;
    border-radius: 999px;
    background-color: var(--color-canvas-parchment);
}

.balance-label {
    font-family: var(--font-text);
    font-size: 14px;
    letter-spacing: -0.224px;
    color: var(--color-body-muted);
}

.balance-value {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    letter-spacing: 0.196px;
    color: var(--color-ink);
}

/* ===== Body Section ===== */
.points-body {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-section);
}

/* ===== Wheel Card ===== */
.wheel-card {
    width: min(600px, 100%);
    margin: 0 auto;
    padding: 40px 24px 32px;
    background-color: var(--color-canvas);
    border-radius: 18px;
}

.wheel-heading {
    text-align: center;
    margin-bottom: 32px;
}

.wheel-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: 0.196px;
    color: var(--color-ink);
    margin: 0 0 6px;
}

.wheel-subtitle {
    font-family: var(--font-text);
    font-size: 14px;
    line-height: 1.4;
    letter-spacing: -0.224px;
    color: #86868b;
    margin: 0;
}

/* ===== Wheel Stage ===== */
.wheel-stage {
    --wheel-size: min(400px, calc(100vw - 120px));

    position: relative;
    width: var(--wheel-size);
    height: var(--wheel-size);
    margin: 0 auto;
    /* 转盘是纯展示区：禁止选中文字、不显示文本光标，
       否则点击空白处后浏览器会把光标放进旋转的扇区里，
       看起来就是一条跟着转盘转的提示线 */
    user-select: none;
    -webkit-user-select: none;
    caret-color: transparent;
}

.wheel-pointer {
    position: absolute;
    top: -12px;
    left: 50%;
    z-index: 3;
    width: 0;
    height: 0;
    border-left: 13px solid transparent;
    border-right: 13px solid transparent;
    border-top: 26px solid #1d1d1f;
    transform: translateX(-50%);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.18));
}

.wheel {
    position: absolute;
    inset: 0;
    border: 8px solid #ffffff;
    border-radius: 50%;
    background-color: #ffffff;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    will-change: transform;
}

.wheel-face {
    position: absolute;
    inset: 0;
    border-radius: 50%;
}

.wheel-label {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding-top: 7%;
    pointer-events: none;
}

.wheel-label-image {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
    background-color: rgba(255, 255, 255, 0.9);
}

.wheel-label-text {
    display: block;
    width: 74px;
    font-family: var(--font-text);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.224px;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    overflow-wrap: break-word;
}

.wheel-button {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 2;
    width: 92px;
    height: 92px;
    border: none;
    border-radius: 50%;
    background-color: #ffffff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
    font-family: var(--font-text);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.36px;
    color: #1d1d1f;
    cursor: pointer;
    transform: translate(-50%, -50%);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.wheel-button:hover:not(:disabled) {
    transform: translate(-50%, -50%) scale(1.05);
}

.wheel-button:active:not(:disabled) {
    transform: translate(-50%, -50%) scale(0.97);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
}

.wheel-button:disabled {
    color: #86868b;
    cursor: default;
}

.wheel-loading {
    padding: 120px 0;
    font-family: var(--font-text);
    font-size: 15px;
    letter-spacing: -0.24px;
    color: #86868b;
    text-align: center;
}

.wheel-result {
    min-height: 24px;
    margin: 28px 0 0;
    font-family: var(--font-text);
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.374px;
    text-align: center;
    color: #1d1d1f;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.wheel-result.is-visible {
    opacity: 1;
}

/* ===== Responsive ===== */
@media (max-width: 834px) {
    .hero-title {
        font-size: 34px;
    }
}

@media (max-width: 640px) {
    .points-hero {
        padding: 48px 17px var(--spacing-lg);
    }

    .hero-title {
        font-size: 28px;
    }

    .hero-tagline {
        font-size: 17px;
    }

    .points-balance {
        margin-top: var(--spacing-sm);
        padding: 6px 16px;
    }

    .balance-value {
        font-size: 22px;
    }

    .points-body {
        padding: var(--spacing-lg) 17px 48px;
    }

    .wheel-card {
        padding: 28px 12px 24px;
    }

    .wheel-heading {
        margin-bottom: 24px;
    }

    .wheel-title {
        font-size: 24px;
    }

    .wheel-label-image {
        width: 32px;
        height: 32px;
    }

    .wheel-label-text {
        width: 62px;
        font-size: 12px;
    }

    .wheel-button {
        width: 76px;
        height: 76px;
        font-size: 16px;
    }
}
</style>
