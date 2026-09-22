<template>
    <div class="forum-container">
        <!-- 吃瓜热榜 -->
        <div class="hot-rank">
            <button
                class="hot-rank-toggle"
                :class="{ 'hot-rank-toggle--open': expanded }"
                :aria-expanded="expanded"
                @click="toggleExpand"
            >
                <span class="hot-rank-title">吃瓜热榜</span>
                <span class="hot-rank-arrow">▾</span>
            </button>
            <!-- 热榜栏目：点击标题展开/收起，数据不足时只渲染已返回的条目 -->
            <div v-if="expanded" class="hot-rank-panel">
                <ul v-if="hotTopics.length" class="hot-rank-list">
                    <li
                        v-for="topic in hotTopics"
                        :key="topic.id"
                        class="hot-rank-item"
                        @click="goHotTopic(topic)"
                    >
                        <span class="hot-rank-badge">{{ topic.rank }}</span>
                        <span class="hot-rank-item-title">{{ topic.title }}</span>
                    </li>
                </ul>
                <p v-else class="hot-rank-empty">暂无热榜内容</p>
            </div>
        </div>
        <!-- 组团，圈子 -->
        <div class="tab-nav">
            <button
                class="tab-btn"
                :class="{ active: $route.name === 'teamup' }"
                @click="handleTeamUpClick"
            >
                组团
            </button>
            <button
                class="tab-btn"
                :class="{ active: $route.name === 'circle' || $route.name === 'Events' || $route.name === 'Dynamic' }"
                @click="handleCircleClick"
            >
                圈子
            </button>
        </div>
        <!-- 展示界面 -->
        <div class="tab-content">
            <router-view />
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from '@/utils/message'
import router from '@/router';
import { getHotRankCircle, detailedCircleUpdates } from '@/api/forum'
import type { HotRankCircle } from '@/api/forum'

const handleTeamUpClick = () => {
    router.push({ name: 'teamup' })
}

const handleCircleClick = () => {
    router.push({ name: 'circle' })
}

/** 热榜条目（后端只返回 id/title/category，前端据此渲染并跳转） */
interface HotTopic {
    rank: number
    id: number | string
    title: string
    /** 圈子详情模块：Dynamic=圈子动态，Task=跑腿任务，Activity=热门活动 */
    option: 'Dynamic' | 'Task' | 'Activity'
}

/** 后端 category -> 圈子详情路由 option 映射 */
const categoryOptionMap: Record<string, HotTopic['option']> = {
    Dynamics: 'Dynamic',
    Task: 'Task',
    Event: 'Activity',
}

const hotTopics = ref<HotTopic[]>([])

/** 热榜栏目展开状态（点击“吃瓜热榜”切换） */
const expanded = ref(false)
const toggleExpand = () => {
    expanded.value = !expanded.value
}

/**
 * 热榜动态/任务模块 title 为空，补充调用详情接口取正文作为展示标题
 */
const fetchFallbackTitle = async (id: number | string, option: HotTopic['option']) => {
    try {
        const res = await detailedCircleUpdates(id, option)
        if (res.code === 1 && res.data) {
            return res.data.title || res.data.content || res.data.requestContent || ''
        }
    } catch {
        // 单条补充失败不影响整体热榜展示
    }
    return ''
}

/** 拉取圈子热榜 */
const fetchHotTopics = async () => {
    try {
        const res = await getHotRankCircle()
        if (res.code === 1 && Array.isArray(res.data)) {
            const topics = await Promise.all(
                res.data.map(async (item: HotRankCircle) => {
                    const option = categoryOptionMap[item.category] ?? 'Dynamic'
                    const title = item.title || (await fetchFallbackTitle(item.id, option))
                    return {
                        id: item.id,
                        title: title || '暂无标题',
                        option,
                    }
                }),
            )
            hotTopics.value = topics.map((item, index) => ({ rank: index + 1, ...item }))
        }
    } catch {
        toast.error('热榜加载失败，请稍后重试')
    }
}

/** 点击热榜条目：直接根据返回的 id 跳转到对应圈子详情 */
const goHotTopic = (topic: HotTopic) => {
    if (!topic.id) return
    router.push({ name: 'CircleUpdatesScan', params: { option: topic.option, id: String(topic.id) } })
}

onMounted(() => {
    fetchHotTopics()
})
</script>
<style scoped>
/* ===== Forum Container ===== */
.forum-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 24px;
}

/* ===== Page Container ===== */
.page-container {
    padding: 0;
    background: #ffffff;
}

/* ===== Hot Rank Section — Apple product-tile-dark pattern ===== */
.hot-rank {
    background: #272729;
    border-radius: 0;
}

/* 标题按钮：整条可点击，展开/收起热榜栏目 */
.hot-rank-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    padding: 20px 32px;
    background: none;
    border: none;
    cursor: pointer;
    color: #ffffff;
    outline: none;
    -webkit-tap-highlight-color: transparent;
}

.hot-rank-title {
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 34px;
    font-weight: 600;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #ffffff;
    white-space: nowrap;
}

.hot-rank-arrow {
    font-size: 20px;
    line-height: 1;
    color: #86868b;
    transition: transform 0.25s ease;
}

.hot-rank-toggle--open .hot-rank-arrow {
    transform: rotate(180deg);
}

/* 展开的热榜栏目 */
.hot-rank-panel {
    padding: 0 32px 16px;
}

.hot-rank-list {
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 360px;
    overflow-y: auto;
}

.hot-rank-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #ffffff;
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    transition: color 0.2s ease;
}

.hot-rank-item:last-child {
    border-bottom: none;
}

.hot-rank-item:hover {
    color: #2997ff;
}

.hot-rank-item-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

/* 无热榜数据时的占位文案 */
.hot-rank-empty {
    margin: 0;
    padding: 8px 0;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    letter-spacing: -0.374px;
    color: #86868b;
}

.hot-rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.29;
    letter-spacing: -0.224px;
    border-radius: 5px;
    background: #0066cc;
    color: #ffffff;
    flex-shrink: 0;
}

/* ===== Tab Navigation — sub-nav-frosted pattern ===== */
.tab-nav {
    display: flex;
    align-items: stretch;
    gap: 32px;
    height: 52px;
    padding: 0 32px;
    background: rgba(245, 245, 247, 0.8);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    position: sticky;
    top: 0;
    z-index: 10;
}

.tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.29;
    letter-spacing: -0.224px;
    color: #7a7a7a;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 16px;
    position: relative;
    transition: color 0.2s ease;
}

.tab-btn:hover {
    color: #1d1d1f;
}

.tab-btn.active {
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 21px;
    font-weight: 600;
    line-height: 1.19;
    letter-spacing: 0.231px;
    color: #1d1d1f;
}

.tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #0066cc;
    border-radius: 1px;
}

/* ===== Tab Content ===== */
.tab-content {
    padding: 24px 0;
    min-height: 400px;
}
</style>