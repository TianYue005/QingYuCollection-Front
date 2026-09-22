<template>
    <div class="events">
        <!-- 内容展示部分 -->
        <div class="events-list">
            <!-- 空白提示 -->
            <div v-if="source.length === 0 && !loading" class="empty-state">
                <img src="/Doubt.svg" alt="图片加载失败" class="empty-image">
                <h2 class="empty-title">喔嚯，好像没有这个东东 ~ ~</h2>
                <h3 class="empty-subtitle">--快来创建精彩活动吧--</h3>
            </div>
            <div
                v-for="value in source"
                :key="value.id"
                class="event-item"
            >
                <div class="event-card" @click="itemClickActive(value.id)">
                    <!-- 左边 -->
                    <div class="event-card__media">
                        <img :src="value.picture?.split(',')[0] || '/Doubt.svg'" alt="活动图片">
                    </div>
                    <!-- 右边 -->
                    <div class="event-card__body">
                        <!-- 垂直上边 -->
                        <div class="event-card__status"
                            :class="{
                                'event-card__status--pending': eventStatus(value) === 0,
                                'event-card__status--end': eventStatus(value) === 2,
                            }">
                            {{ statusText(eventStatus(value)) }}
                        </div>
                        <!-- 垂直中间 -->
                        <div class="event-card__title">
                            {{ value.title }}
                        </div>
                        <div class="event-card__time">
                            {{ value.startTime }} 至 {{ value.endTime }}
                        </div>
                        <button class="event-comment-toggle" @click.stop="toggleComment(value.id)">
                            {{ expandedId === value.id ? '收起评论' : '评论' }}
                        </button>
                    </div>
                </div>
                <CircleComment v-if="expandedId === value.id" :circle-id="value.id" />
            </div>
        </div>
        <!-- 加载更多 -->
        <div ref="sentinelRef" class="load-more">
            <span v-if="loading">加载中...</span>
            <span v-else-if="!hasMore && source.length > 0">没有更多了</span>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch, inject } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCircleActivities, getActivityStatus, searchCircleActivities } from '@/api/forum'
import type { Circle } from '@/api/forum'
import { toast } from '@/utils/message'
import CircleComment from '@/components/CircleComment.vue'

const route = useRoute()
const router = useRouter()
// 搜索关键词（来自父组件 Circle 的 query.keyword）
const searchKeyword = ref('')
// 父组件发布成功后通知刷新
const refreshSignal = inject<Ref<number>>('circleRefreshSignal', ref(0))

// ==================== 分页加载 ====================
const source = ref<Circle[]>([])
const total = ref(0)
const page = ref(1)

// 当前展开评论的圈子 id（null 表示全部收起）
const expandedId = ref<number | null>(null)
const toggleComment = (id: number) => {
    expandedId.value = expandedId.value === id ? null : id
}
const pageSize = 10
const loading = ref(false)
const hasMore = ref(true)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
// 是否在请求过程中被要求回到第一页刷新（加载中切换 tab / 发布后刷新）
let pendingReload = false

/** 回到第一页重新加载 */
const reloadFirstPage = async () => {
    page.value = 1
    total.value = 0
    hasMore.value = true
    if (loading.value) {
        // 上一次请求仍在进行中：标记待刷新，请求结束后自动重新加载
        pendingReload = true
        return
    }
    await fetchPage()
}

/** 加载一页活动数据（加载更多时追加） */
const fetchPage = async (isLoadMore = false) => {
    if (loading.value) return
    loading.value = true
    try {
        const kw = searchKeyword.value.trim()
        if (kw) {
            // 搜索模式：后端固定返回第一页 10 条，不参与无限滚动
            const res = await searchCircleActivities(kw)
            if (res.code === 1 && res.data) {
                total.value = Number(res.data.total)
                source.value = res.data.rows
                hasMore.value = false
            }
            return
        }
        // 后端 SQL 已固定 category='Event'，无需（也不允许）再传 category
        const res = await getCircleActivities({
            pageNumber: page.value,
            pageSize,
            sortRules: 'start_time desc',
        })
        if (res.code === 1 && res.data) {
            total.value = Number(res.data.total)
            const rows = res.data.rows ?? []
            if (isLoadMore) {
                // 加载更多时按 id 去重，避免分页加载时重复数据
                const existingIds = new Set(source.value.map((item) => item.id))
                source.value.push(...rows.filter((item) => !existingIds.has(item.id)))
            } else {
                // 首次/刷新加载：整体替换，避免旧列表残留导致去重后清空
                source.value = rows
            }
            hasMore.value = source.value.length < total.value
        }
    } catch {
        toast.error('加载失败，请稍后重试')
    } finally {
        loading.value = false
        if (pendingReload) {
            pendingReload = false
            void reloadFirstPage()
        }
    }
}

//监听搜索关键词变化
watch(
    () => route.query.keyword,
    (kw) => {
        searchKeyword.value = (kw as string) || ''
        reloadFirstPage()
    },
    { immediate: true }
)
// 父组件发布成功后刷新第一页
watch(refreshSignal, () => {
    reloadFirstPage()
})

//活动状态：0 未开始，1 已开始，2 已结束（后端不再返回 status，由起止时间推导）
const eventStatus = (item: Circle): number => getActivityStatus(item.startTime, item.endTime)

//状态文案
const statusText = (status: number): string => {
    const map: Record<number, string> = {
        0: "未开始",
        1: "已开始",
        2: "已结束",
    }
    return map[status] ?? "未知"
}

const itemClickActive = (id: number) => {
    // 跳转到活动详情（option 固定为 Activity）
    router.push({ name: 'CircleUpdatesScan', params: { option: 'Activity', id } })
}

// ==================== 无限滚动加载 ====================
function setupObserver() {
    if (!sentinelRef.value) return
    observer = new IntersectionObserver(
        (entries) => {
            if (entries[0]?.isIntersecting && hasMore.value && !loading.value) {
                page.value++
                fetchPage(true)
            }
        },
        { rootMargin: '100px' }
    )
    observer.observe(sentinelRef.value)
}

onMounted(() => {
    // 首次加载由上方 immediate watch 触发（reloadFirstPage），这里只初始化无限滚动
    nextTick(setupObserver)
})

onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
})
</script>
<style scoped>
.events {
    max-width: 980px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-lg);
    font-family: var(--font-body);
    color: var(--color-ink);
}

/* ---- 活动列表 ---- */
.events-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}

/* 活动卡片（store-utility-card：白色 + hairline + lg 圆角） */
.event-card {
    display: flex;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    background: var(--color-canvas);
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-lg);
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease;
}

.event-card:hover {
    background: var(--color-surface-pearl);
}

.event-card:active {
    transform: scale(0.98);
}

.event-card__media {
    flex-shrink: 0;
    width: 180px;
    height: 180px;
    overflow: hidden;
    border-radius: var(--rounded-sm);
    background: var(--color-canvas-parchment);
    /* 唯一的投影：仅用于图片，Apple 风格 */
    box-shadow: var(--shadow-product);
}

.event-card__media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.event-card__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: var(--spacing-xs);
}

.event-card__status {
    padding: 4px 12px;
    border-radius: var(--rounded-pill);
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.12px;
}

.event-card__status--pending {
    background: var(--color-canvas-parchment);
    color: var(--color-ink-muted-80);
}

.event-card__status--end {
    background: var(--color-canvas-parchment);
    color: var(--color-ink-muted-48);
}

.event-card__title {
    margin-top: var(--spacing-xxs);
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 600;
    line-height: 1.19;
    letter-spacing: 0.231px;
}

.event-card__time {
    color: var(--color-ink-muted-48);
    font-size: 14px;
    line-height: 1.43;
    letter-spacing: -0.224px;
}

/* 评论开关 */
.event-comment-toggle {
    margin-top: var(--spacing-xs);
    height: 32px;
    padding: 0 16px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #0066cc;
    background: rgba(0, 102, 204, 0.08);
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
}

.event-comment-toggle:hover {
    background: rgba(0, 102, 204, 0.14);
}

.event-comment-toggle:active {
    transform: scale(0.96);
}

/* 评论外层容器 */
.event-item {
    display: flex;
    flex-direction: column;
}

.event-item .circle-comment {
    margin-top: 12px;
    padding: 16px 20px;
    background: #ffffff;
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-lg);
}

/* ---- 空状态 ---- */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl) var(--spacing-lg);
    background: var(--color-canvas-parchment);
    border-radius: var(--rounded-lg);
}

.empty-image {
    width: 120px;
    height: 120px;
    margin-bottom: var(--spacing-xl);
    opacity: 0.6;
    user-select: none;
    pointer-events: none;
}

.empty-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 400;
    line-height: 1.14;
    letter-spacing: 0.196px;
    color: var(--color-ink);
    margin: 0 0 8px 0;
}

.empty-subtitle {
    font-family: var(--font-body);
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: var(--color-ink-muted-48);
    margin: 0;
}

/* ---- 加载更多 ---- */
.load-more {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: var(--spacing-md) 0;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.43;
    letter-spacing: -0.224px;
    color: var(--color-ink-muted-48);
}

/* ---- 响应式：小屏时卡片纵向排列 ---- */
@media (max-width: 640px) {
    .event-card {
        flex-direction: column;
    }

    .event-card__media {
        width: 100%;
        height: 0;
        padding-bottom: 100%;
        position: relative;
    }

    .event-card__media img {
        position: absolute;
        inset: 0;
    }
}
</style>
