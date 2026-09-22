<template>
    <div class="circle-scan">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
            <span class="loading-spinner"></span>
            <p class="loading-text">加载中...</p>
        </div>

        <!-- 错误提示 -->
        <div v-else-if="errorMsg" class="error-state">
            <h2 class="error-title">{{ errorMsg }}</h2>
            <button class="btn-retry" @click="fetchDetail">重试</button>
        </div>

        <!-- 详情内容 -->
        <div v-else-if="detail" class="detail-card">
            <!-- 返回按钮 + 徽章 -->
            <div class="detail-top-bar">
                <button class="btn-back" @click="goBack">
                    <span class="back-arrow">‹</span> 返回
                </button>
                <span v-if="badgeText" class="detail-type-badge">{{ badgeText }}</span>
            </div>

            <!-- 圈子动态 -->
            <template v-if="option === 'Dynamic'">
                <h1 class="detail-title">{{ detail.content }}</h1>
                <div class="detail-info-list">
                    <div class="info-row">
                        <span class="info-label">类型</span>
                        <span class="info-value">#{{ detail.type }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">发布时间</span>
                        <span class="info-value">{{ formatTime(detail.createTime) }}</span>
                    </div>
                </div>
            </template>

            <!-- 跑腿任务 -->
            <template v-else-if="option === 'Task'">
                <div class="task-bounty">
                    <span class="bounty-label">赏金</span>
                    <span class="bounty-value">{{ detail.bounty }}￥</span>
                </div>
                <div class="detail-info-list">
                    <div class="info-row">
                        <span class="info-label">任务类型</span>
                        <span class="info-value">{{ detail.type }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">任务要求</span>
                        <span class="info-value">{{ detail.requestContent }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">备注</span>
                        <span class="info-value">{{ detail.note || '无' }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">发布时间</span>
                        <span class="info-value">{{ formatTime(detail.createTime) }}</span>
                    </div>
                </div>

                <!-- 接取任务 -->
                <div class="task-actions">
                    <button class="btn-accept" :disabled="!canAccept" @click="handleAcceptTask">
                        {{ acceptButtonText }}
                    </button>
                    <span v-if="taskTaken" class="task-tip">该任务已有人接单</span>
                </div>
            </template>

            <!-- 热门活动 -->
            <template v-else-if="option === 'Activity'">
                <div v-if="splitPictures(detail.picture).length" class="activity-media">
                    <img v-for="(pic, index) in splitPictures(detail.picture)" :key="index" :src="pic" alt="活动图片"
                        class="activity-picture">
                </div>
                <h1 class="detail-title">{{ detail.title }}</h1>
                <div class="detail-info-list">
                    <div class="info-row">
                        <span class="info-label">状态</span>
                        <span class="info-value">{{ statusText }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">开始时间</span>
                        <span class="info-value">{{ formatTime(detail.startTime) }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">结束时间</span>
                        <span class="info-value">{{ formatTime(detail.endTime) }}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">参与人数</span>
                        <span class="info-value">{{ detail.numberOfParticipants ?? 0 }}</span>
                    </div>
                </div>

                <!-- 加入活动 -->
                <div class="activity-actions">
                    <button class="btn-join" :disabled="!canJoinActivity" @click="handleJoinActivity">
                        {{ joinButtonText }}
                    </button>
                </div>
            </template>

            <!-- 点赞 -->
            <div class="like-bar">
                <button
                    class="btn-like"
                    :class="{ 'btn-like--liked': isLike === 1 }"
                    :disabled="isLike === 1 || liking"
                    @click="handleLike"
                >
                    <svg class="like-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <!-- 未点赞：空心爱心；已点赞：实心爱心 -->
                        <path
                            d="M12 20.25C12 20.25 3.75 15.75 3.75 9.75C3.75 6.75 6 4.5 8.7 4.5C10.35 4.5 11.55 5.4 12 6.3C12.45 5.4 13.65 4.5 15.3 4.5C18 4.5 20.25 6.75 20.25 9.75C20.25 15.75 12 20.25 12 20.25Z"
                            :fill="isLike === 1 ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.6"
                            stroke-linejoin="round" />
                    </svg>
                    <span class="like-count">{{ likeCount }}</span>
                </button>
            </div>
        </div>

        <!-- 评论区 -->
        <div v-if="detail" class="comment-section">
            <h2 class="comment-heading">评论</h2>
            <div class="comment-wrap">
                <CircleComment :circle-id="detail.id" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/message'
import { acceptTask, detailedCircleUpdates, getActivityStatus, joinActivity, likeCircle } from '@/api/forum'
import type { Circle } from '@/api/forum'
import { getUserId } from '@/composables/useAuth'
import CircleComment from '@/components/CircleComment.vue'

const route = useRoute()
const router = useRouter()

/** 从路由参数中取圈子 id 与模块 option（Dynamic/Task/Activity） */
const id = route.params.id as string
const option = ref((route.params.option as string) || 'Dynamic')

const detail = ref<Circle | null>(null)
const loading = ref(false)
const errorMsg = ref('')

/** 点赞状态：总数 + 当前用户是否已点赞（1=已点赞，0=未点赞） */
const likeCount = ref(0)
const isLike = ref(0)
const liking = ref(false)

/** 请求圈子详情 */
const fetchDetail = async () => {
    loading.value = true
    errorMsg.value = ''
    try {
        const res = await detailedCircleUpdates(id, option.value as 'Dynamic' | 'Task' | 'Activity')
        if (res.code === 1 && res.data) {
            detail.value = res.data
            // 动态/活动详情返回 likeCount，跑腿任务详情返回 likeNumber
            likeCount.value = res.data.likeCount ?? res.data.likeNumber ?? 0
            // 后端用 COUNT(*) 统计当前用户点赞记录，非 0 即视为已点赞
            isLike.value = Number(res.data.isLike) > 0 ? 1 : 0
            // 活动的 participant 为当前用户是否已参加的 COUNT 结果，非 0 即已参加
            joinedActivity.value = Number(res.data.participant) > 0
        } else {
            errorMsg.value = res.msg || '获取详情失败'
        }
    } catch {
        errorMsg.value = '网络异常，请稍后重试'
    } finally {
        loading.value = false
    }
}

/** 点赞：成功后本地 +1 并置为已点赞；已点过赞后端会失败，保持原状态并提示 */
const handleLike = async () => {
    if (isLike.value === 1 || liking.value) return
    liking.value = true
    try {
        const res = await likeCircle(id)
        if (res.code === 1) {
            likeCount.value += 1
            isLike.value = 1
        } else {
            toast.warning(res.msg || '点赞失败')
        }
    } catch {
        toast.warning('已点赞')
    } finally {
        liking.value = false
    }
}

/** 返回上一页 */
const goBack = () => {
    router.back()
}

/* ---- 跑腿任务：接取 ---- */

/** 是否已有人接单（详情接口 total 由 accept_task 表统计得出） */
const taskTaken = computed(() => detail.value?.total === true)
/** 是否是当前登录用户自己发布的任务（详情接口返回 user_id） */
const isOwnTask = computed(() => {
    const currentUserId = getUserId()
    const publisherId = detail.value?.userId
    return currentUserId != null && publisherId != null && Number(publisherId) === currentUserId
})
const accepting = ref(false)
/** 可接取：任务存在、非自己发布、还没人接单、且不在请求中 */
const canAccept = computed(
    () => !!detail.value && !isOwnTask.value && !taskTaken.value && !accepting.value,
)

const acceptButtonText = computed(() => {
    if (isOwnTask.value) return '不能接取自己发布的任务'
    if (taskTaken.value) return '任务已被接取'
    return accepting.value ? '接单中...' : '接取任务'
})

/** 接取任务：成功后重新拉取详情，让按钮切到「任务已被接取」 */
const handleAcceptTask = async () => {
    if (!canAccept.value) return
    accepting.value = true
    try {
        const res = await acceptTask(id)
        if (res.code === 1) {
            toast.success('接单成功')
            await fetchDetail()
        } else {
            toast.warning(res.msg || '接单失败')
        }
    } catch {
        toast.error('网络异常，请稍后重试')
    } finally {
        accepting.value = false
    }
}

/** 活动状态文案：0 未开始，1 已开始，2 已结束（后端不再返回 status，由起止时间推导） */
const statusText = computed(() => {
    const map: Record<number, string> = { 0: '未开始', 1: '已开始', 2: '已结束' }
    const status = getActivityStatus(detail.value?.startTime, detail.value?.endTime)
    return map[status] ?? '未知'
})

/* ---- 热门活动：加入 ---- */

const joiningActivity = ref(false)
// 详情接口的 participant 为当前用户是否已参加（COUNT 结果），据此恢复按钮状态
const joinedActivity = ref(false)
/** 可加入：活动存在、未加入过、且不在请求中 */
const canJoinActivity = computed(
    () => !!detail.value && !joinedActivity.value && !joiningActivity.value,
)

const joinButtonText = computed(() => {
    if (joinedActivity.value) return '已加入'
    return joiningActivity.value ? '加入中...' : '加入活动'
})

/** 加入活动：重复加入时后端返回 code=0 并提示「你已加入过该活动」 */
const handleJoinActivity = async () => {
    if (!canJoinActivity.value) return
    joiningActivity.value = true
    try {
        const res = await joinActivity(id)
        if (res.code === 1) {
            toast.success('已加入活动')
            // 重新拉取详情，让参与人数与按钮状态同步
            await fetchDetail()
        } else {
            toast.warning(res.msg || '加入失败')
        }
    } catch {
        toast.error('网络异常，请稍后重试')
    } finally {
        joiningActivity.value = false
    }
}

/** 顶部徽章：动态/任务显示类型，活动显示状态 */
const badgeText = computed(() => {
    if (!detail.value) return ''
    return option.value === 'Activity' ? statusText.value : detail.value.type
})

/** 将后端时间（可能是 2026-08-14T01:38:40）格式化为易读的 yyyy-MM-dd HH:mm */
const formatTime = (time?: string) => {
    if (!time) return ''
    return time.replace('T', ' ').slice(0, 16)
}

/** 活动图片可能存在多个（英文逗号拼接），拆分成 url 数组用于展示 */
const splitPictures = (picture: string) => {
    return picture ? picture.split(',').filter(Boolean) : []
}

onMounted(fetchDetail)
</script>

<style scoped>
/* ============================================
   Apple Design System — CircleUpdatesScan 圈子详情
   参考: {colors}, {typography}, {rounded}, {spacing}
   ============================================ */

.circle-scan {
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    color: #1d1d1f;
}

/* ---------- 加载状态 ---------- */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120px 24px;
}

.loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e0e0e0;
    border-top-color: #0066cc;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    margin-top: 16px;
    font-size: 17px;
    font-weight: 400;
    color: #7a7a7a;
    letter-spacing: -0.374px;
}

/* ---------- 错误状态 ---------- */
.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120px 24px;
}

.error-title {
    font-size: 20px;
    font-weight: 600;
    color: #1d1d1f;
    margin: 0 0 24px;
}

.btn-retry {
    height: 44px;
    padding: 0 28px;
    font-size: 17px;
    font-weight: 400;
    color: #ffffff;
    background: #0066cc;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.btn-retry:hover {
    background: #0071e3;
}

.btn-retry:active {
    transform: scale(0.95);
}

/* ---------- 详情卡片 ---------- */
.detail-card {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 20px;
    padding: 32px 28px;
}

/* ---------- 顶栏：返回按钮 + 徽章 ---------- */
.detail-top-bar {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
}

/* ---------- 返回按钮 ---------- */
.btn-back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    color: #0066cc;
    background: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    transition: opacity 0.15s ease;
}

.btn-back:hover {
    opacity: 0.7;
}

.back-arrow {
    font-size: 24px;
    line-height: 1;
}

/* ---------- 类型/状态徽章 ---------- */
.detail-type-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    padding: 4px 14px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.12px;
    color: #0066cc;
    background: rgba(0, 102, 204, 0.08);
    border-radius: 9999px;
}

/* ---------- 标题 ---------- */
.detail-title {
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 28px;
    font-weight: 600;
    line-height: 1.14;
    letter-spacing: 0.196px;
    color: #1d1d1f;
    margin: 0 0 28px;
    white-space: pre-wrap;
    word-break: break-word;
}

/* ---------- 活动图片 ---------- */
.activity-media {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 24px;
}

.activity-picture {
    display: block;
    width: 100%;
    max-height: 360px;
    object-fit: cover;
    border-radius: 14px;
    background: #f5f5f7;
}

/* ---------- 任务赏金 ---------- */
.task-bounty {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 24px;
}

.bounty-label {
    font-size: 17px;
    font-weight: 400;
    color: #7a7a7a;
}

.bounty-value {
    font-size: 34px;
    font-weight: 600;
    color: #0066cc;
    letter-spacing: 0.196px;
}

/* ---------- 信息列表 ---------- */
.detail-info-list {
    display: flex;
    flex-direction: column;
    border-top: 1px solid #e0e0e0;
}

.info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid #e0e0e0;
}

.info-row:last-child {
    border-bottom: none;
}

.info-label {
    flex-shrink: 0;
    font-size: 15px;
    font-weight: 400;
    color: #7a7a7a;
    letter-spacing: -0.224px;
}

.info-value {
    font-size: 15px;
    font-weight: 500;
    color: #1d1d1f;
    letter-spacing: -0.224px;
    text-align: right;
    word-break: break-word;
}

/* ---------- 接取任务 ---------- */
.task-actions,
.activity-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-top: 28px;
}

.btn-accept,
.btn-join {
    min-width: 160px;
    height: 44px;
    padding: 0 28px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 500;
    color: #ffffff;
    background: #0066cc;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    outline: none;
    user-select: none;
    transition: background 0.2s ease, transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
}

.btn-accept:hover:not(:disabled),
.btn-join:hover:not(:disabled) {
    background: #0071e3;
}

.btn-accept:active:not(:disabled),
.btn-join:active:not(:disabled) {
    transform: scale(0.95);
}

.btn-accept:disabled,
.btn-join:disabled {
    color: #86868b;
    background: #f5f5f7;
    cursor: not-allowed;
}

.task-tip {
    font-size: 13px;
    font-weight: 400;
    color: #7a7a7a;
    letter-spacing: -0.12px;
}

/* ---------- 点赞 ---------- */
.like-bar {
    display: flex;
    justify-content: center;
    margin-top: 28px;
}

.btn-like {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 96px;
    height: 44px;
    padding: 0 24px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 500;
    color: #0066cc;
    background: rgba(0, 102, 204, 0.08);
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    outline: none;
    user-select: none;
    transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
}

.btn-like:hover:not(:disabled) {
    background: rgba(0, 102, 204, 0.16);
}

.btn-like:active:not(:disabled) {
    transform: scale(0.95);
}

.btn-like:disabled {
    cursor: not-allowed;
    opacity: 0.65;
}

/* 已点赞：置灰禁用 */
.btn-like--liked {
    color: #86868b;
    background: #f5f5f7;
}

.like-icon {
    display: block;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

/* ---------- 评论区 ---------- */
.comment-section {
    margin-top: 32px;
}

.comment-heading {
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.18;
    letter-spacing: 0.196px;
    color: #1d1d1f;
    margin: 0 0 20px;
}

/* 评论面板外层：羊皮纸底，与列表页评论观感一致 */
.comment-wrap {
    background: #f5f5f7;
    border-radius: 20px;
    padding: 20px;
}

/* ---------- 响应式 ---------- */
@media (min-width: 641px) {
    .detail-card {
        padding: 40px 36px;
    }

    .detail-title {
        font-size: 34px;
    }
}
</style>
