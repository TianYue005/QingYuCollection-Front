<template>
    <!-- 圈子动态 -->
    <div v-if="option === 'CircleUpdates'" class="feed-list">
        <!-- 空白提示 -->
        <div v-if="sourceC.length === 0 && !loading" class="empty-state">
            <img src="/Doubt.svg" alt="图片加载失败" class="empty-image">
            <h2 class="empty-title">喔嚯，好像没有这个东东 ~ ~</h2>
            <h3 class="empty-subtitle">--快来分享有趣的事情吧--</h3>
        </div>
        <div v-for="value in sourceC" :key="value.id" class="feed-card" @click="goDetail(value.id)">
            <!-- 中间部分 -->
            <div class="card-body">
                <span class="type-chip">#{{ value.type }}</span>
                <span class="content">{{ value.content }}</span>
            </div>
            <!-- 底部时间 -->
            <div class="card-footer">
                <div class="card-time">{{ value.createTime }}</div>
                <button class="comment-toggle" @click.stop="toggleComment(value.id)">
                    {{ expandedId === value.id ? '收起评论' : '评论' }}
                </button>
            </div>
            <CircleComment v-if="expandedId === value.id" :circle-id="value.id" />
        </div>
    </div>
    <!-- 跑腿任务 -->
    <div v-if="option === 'ErrandTask'" class="feed-list">
        <!-- 空白提示 -->
        <div v-if="sourceT.length === 0 && !loading" class="empty-state">
            <img src="/Doubt.svg" alt="图片加载失败" class="empty-image">
            <h2 class="empty-title">喔嚯，好像没有这个东东 ~ ~</h2>
            <h3 class="empty-subtitle">--快来发布跑腿任务吧--</h3>
        </div>
        <div v-for="value in sourceT" :key="value.id" class="feed-card" @click="goDetail(value.id)">
            <!-- 中间部分 -->
            <div class="card-body task-body">
                <div class="task-meta">
                    <span class="type-chip">{{ value.type }}</span>
                    <span class="bounty">赏金：<span class="bounty-num">{{ value.bounty }}</span>￥</span>
                </div>
                <div class="task-request">
                    任务要求：
                    <div class="request-content">{{ value.requestContent }}</div>
                    备注：
                    <div class="request-note">{{ value.note }}</div>
                </div>
            </div>
            <!-- 底部时间 -->
            <div class="card-footer">
                <div class="card-time">{{ value.createTime }}</div>
                <button class="comment-toggle" @click.stop="toggleComment(value.id)">
                    {{ expandedId === value.id ? '收起评论' : '评论' }}
                </button>
            </div>
            <CircleComment v-if="expandedId === value.id" :circle-id="value.id" />
        </div>
    </div>
    <!-- 加载更多 -->
    <div ref="sentinelRef" class="load-more">
        <span v-if="loading">加载中...</span>
        <span v-else-if="!hasMore && sourceC.length + sourceT.length > 0">没有更多了</span>
    </div>
</template>
<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount, watch, inject } from 'vue';
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { getCircleDynamics, getCircleTasks, searchCircleDynamics, searchCircleTasks } from '@/api/forum'
import type { Circle } from '@/api/forum'
import { toast } from '@/utils/message'
import CircleComment from '@/components/CircleComment.vue'

const route = useRoute()
const router = useRouter()
const option = ref('CircleUpdates')
// 搜索关键词（来自父组件 Circle 的 query.keyword）
const searchKeyword = ref('')
// 父组件发布成功后通知刷新
const refreshSignal = inject<Ref<number>>('circleRefreshSignal', ref(0))

// 圈子动态（Dynamics 分类）
const sourceC = ref<Circle[]>([])
// 跑腿任务（Task 分类）
const sourceT = ref<Circle[]>([])

// 当前展开评论的圈子 id（null 表示全部收起）
const expandedId = ref<number | null>(null)
const toggleComment = (id: number) => {
    expandedId.value = expandedId.value === id ? null : id
}

/** 点击条目跳转详情：根据当前模块传递 option（圈子动态=Dynamic，跑腿任务=Task） */
const goDetail = (id: number) => {
    const moduleOption = option.value === 'CircleUpdates' ? 'Dynamic' : 'Task'
    router.push({ name: 'CircleUpdatesScan', params: { option: moduleOption, id } })
}

// ==================== 分页加载 ====================
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const hasMore = ref(true)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
// 是否在请求过程中被要求回到第一页刷新（加载中切换 tab / 发布后刷新）
let pendingReload = false

/** 当前展示的是否为圈子动态 */
const isDynamic = () => option.value === 'CircleUpdates'

/** 加载一页数据（加载更多时追加） */
const fetchPage = async (isLoadMore = false) => {
    if (loading.value) return
    loading.value = true
    try {
        const kw = searchKeyword.value.trim()
        const target = isDynamic() ? sourceC.value : sourceT.value
        if (kw) {
            // 搜索模式：后端固定返回第一页 10 条，不参与无限滚动
            const res = isDynamic()
                ? await searchCircleDynamics(kw)
                : await searchCircleTasks(kw)
            if (res.code === 1 && res.data) {
                total.value = Number(res.data.total)
                if (isDynamic()) {
                    sourceC.value = res.data.rows
                } else {
                    sourceT.value = res.data.rows
                }
                hasMore.value = false
            }
            return
        }
        // 后端 SQL 已固定按 category 过滤，无需（也不允许）再传 category
        const params = {
            pageNumber: page.value,
            pageSize,
            sortRules: 'create_time desc',
        }
        const res = isDynamic()
            ? await getCircleDynamics(params)
            : await getCircleTasks(params)
        if (res.code === 1 && res.data) {
            total.value = Number(res.data.total)
            const rows = res.data.rows ?? []
            if (isLoadMore) {
                // 加载更多时按 id 去重，避免分页加载时重复数据
                const existingIds = new Set(target.map((item) => item.id))
                target.push(...rows.filter((item) => !existingIds.has(item.id)))
            } else if (isDynamic()) {
                // 首次/刷新加载：整体替换，避免旧列表残留导致去重后清空
                sourceC.value = rows
            } else {
                sourceT.value = rows
            }
            hasMore.value = target.length < total.value
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

const Judgement = () => {
    option.value = (route.query.option as string) || 'CircleUpdates'
    searchKeyword.value = (route.query.keyword as string) || ''
    reloadFirstPage()
}
// 监听 query 变化，同一组件复用时也能响应（标签切换 / 搜索）
watch(
    () => [route.query.option, route.query.keyword],
    () => {
        Judgement()
    },
    { immediate: true }
)
// 父组件发布成功后刷新第一页
watch(refreshSignal, () => {
    reloadFirstPage()
})

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
    nextTick(setupObserver)
})

onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
})
</script>
<style scoped>
/* ============================================
   Apple Design System — Dynamic 圈子动态 / 跑腿任务
   参考: {colors} {typography} {rounded} {spacing}
   ============================================ */

/* ---------- 容器 ---------- */
.feed-list {
    display: flex;
    flex-direction: column;
    gap: 17px; /* spacing.md */
    padding: 24px; /* spacing.lg */
    background: #f5f5f7; /* canvas-parchment */
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    color: #1d1d1f; /* ink */
}

/* ---------- 卡片 — 参考 store-utility-card ---------- */
.feed-card {
    background: #ffffff; /* canvas */
    border: 1px solid rgba(0, 0, 0, 0.08); /* soft hairline */
    border-radius: 18px; /* rounded.lg */
    padding: 24px; /* spacing.lg */
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.2s ease;
}

.feed-card:hover {
    border-color: #0066cc;
    transform: translateY(-1px);
}

.feed-card:active {
    transform: scale(0.985);
}

/* 时间 — caption / ink-muted-48 */
.card-time {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.43;
    letter-spacing: -0.224px;
    color: #7a7a7a; /* ink-muted-48 */
}

/* 评论开关 */
.comment-toggle {
    margin-left: auto;
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

.comment-toggle:hover {
    background: rgba(0, 102, 204, 0.14);
}

.comment-toggle:active {
    transform: scale(0.96);
}

/* ---------- 中间内容 ---------- */
.card-body {
    display: flex;
    align-items: flex-start;
    gap: 8px; /* spacing.xs */
    flex-wrap: wrap;
}

/* 类型标签 — 参考 button-pearl-capsule */
.type-chip {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    background: #fafafc; /* surface-pearl */
    color: #333333; /* ink-muted-80 */
    border: 3px solid #f0f0f0; /* divider-soft 软环 */
    border-radius: 11px; /* rounded.md */
    padding: 6px 12px;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.29;
    letter-spacing: -0.224px;
    white-space: nowrap;
}

/* 正文 — body */
.content {
    flex: 1;
    min-width: 200px;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #1d1d1f; /* ink */
}

/* ---------- 底部时间 ---------- */
.card-footer {
    display: flex;
    align-items: center;
    gap: 24px; /* spacing.lg */
    margin-top: 17px; /* spacing.md */
    padding-top: 12px; /* spacing.sm */
    border-top: 1px solid rgba(0, 0, 0, 0.04); /* divider-soft */
}

/* ============================================
   跑腿任务专用
   ============================================ */

/* 任务主体 */
.task-body {
    flex-direction: column;
    gap: 17px; /* spacing.md */
}

/* 类型 + 赏金行 */
.task-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px; /* spacing.sm */
    width: 100%;
}

/* 赏金 */
.bounty {
    flex-shrink: 0;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #1d1d1f; /* ink */
}

/* 赏金金额 — 蓝色强调 */
.bounty-num {
    font-size: 21px; /* tagline */
    font-weight: 600;
    line-height: 1.19;
    letter-spacing: 0.231px;
    color: #0066cc; /* primary */
}

/* 任务要求 — 羊皮纸内嵌块（浅色表面切换产生层次） */
.task-request {
    width: 100%;
    background: #f5f5f7; /* canvas-parchment */
    border-radius: 8px; /* rounded.sm */
    padding: 17px; /* spacing.md */
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #1d1d1f; /* ink */
}

.request-content,
.request-note {
    margin: 4px 0 12px; /* spacing.xxs 0 spacing.sm */
    color: #333333; /* ink-muted-80 */
}

.request-note {
    margin-bottom: 0;
}

/* ============================================
   空状态 — empty-state
   ============================================ */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    background: #f5f5f7;
    border-radius: 18px;
}

.empty-image {
    width: 120px;
    height: 120px;
    margin-bottom: 32px;
    opacity: 0.6;
    user-select: none;
    pointer-events: none;
}

.empty-title {
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 28px;
    font-weight: 400;
    line-height: 1.14;
    letter-spacing: 0.196px;
    color: #1d1d1f;
    margin: 0 0 8px 0;
}

.empty-subtitle {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #7a7a7a;
    margin: 0;
}

/* ============================================
   加载更多 — load-more
   ============================================ */
.load-more {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 16px 0;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.43;
    letter-spacing: -0.224px;
    color: #7a7a7a;
}

/* ============================================
   响应式 — 参考 Apple 断点（640px 手机端收窄留白）
   ============================================ */
@media (max-width: 640px) {
    .feed-list {
        padding: 17px; /* spacing.md */
    }

    .feed-card {
        padding: 17px; /* spacing.md */
        border-radius: 11px; /* rounded.md */
    }
}
</style>