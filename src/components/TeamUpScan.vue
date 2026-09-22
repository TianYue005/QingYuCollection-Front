<template>
    <div class="team-up-scan">
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
            <!-- 返回按钮 + 类型徽章 -->
            <div class="detail-top-bar">
                <button class="btn-back" @click="goBack">
                    <span class="back-arrow">‹</span> 返回
                </button>
                <span class="detail-type-badge">{{ typeMap[detail.type] || detail.type }}</span>
            </div>

            <!-- 标题 -->
            <h1 class="detail-title">{{ detail.title }}</h1>

            <!-- 信息区 -->
            <div class="detail-info-list">
                <div class="info-row">
                    <span class="info-label">团长</span>
                    <span class="info-value">{{ detail.leaderName || detail.leader }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">参与人数</span>
                    <span class="info-value">{{ detail.participateNumber ?? 0 }} / {{ detail.peopleNumber ?? 0 }} 人</span>
                </div>
                <div v-if="detail.joined > 0" class="info-row">
                    <span class="info-label">参与状态</span>
                    <span class="info-value info-value--joined">已参与</span>
                </div>
                <div class="info-row">
                    <span class="info-label">开始时间</span>
                    <span class="info-value">{{ detail.startTime }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">创建时间</span>
                    <span class="info-value">{{ detail.createAt }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">更新时间</span>
                    <span class="info-value">{{ detail.updateAt }}</span>
                </div>
            </div>

            <!-- 参加组团 -->
            <div class="join-bar">
                <button
                    class="btn-join"
                    :class="{ 'btn-join--joined': detail.joined > 0 }"
                    :disabled="detail.joined > 0 || joining"
                    @click="handleJoin"
                >
                    {{ detail.joined > 0 ? '已经参与' : (joining ? '参加中...' : '参加组团') }}
                </button>
            </div>
        </div>

        <!-- 评论区 -->
        <div v-if="detail" class="comment-section">
            <h2 class="comment-heading">评论</h2>

            <!-- 发表评论 -->
            <div class="comment-composer">
                <textarea
                    v-model="commentText"
                    class="comment-input"
                    placeholder="写下你的评论..."
                    maxlength="500"
                ></textarea>
                <button
                    class="comment-submit"
                    :disabled="commentSubmitting"
                    @click="submitComment"
                >
                    {{ commentSubmitting ? '发布中...' : '发布' }}
                </button>
            </div>
            <p v-if="commentError" class="comment-error">{{ commentError }}</p>

            <!-- 加载状态 -->
            <div v-if="commentLoading" class="comment-loading">加载中...</div>

            <!-- 空状态 -->
            <div v-else-if="comments.length === 0" class="comment-empty">
                还没有评论，快来抢沙发~
            </div>

            <!-- 瀑布流评论 -->
            <div v-else class="comment-masonry">
                <div v-for="c in comments" :key="c.id" class="comment-card">
                    <div class="comment-head">
                        <img
                            v-if="c.userAvatar"
                            :src="c.userAvatar"
                            alt="头像"
                            class="comment-avatar"
                        />
                        <span v-else class="comment-avatar comment-avatar-fallback">
                            {{ avatarInitial(c.userName) }}
                        </span>
                        <div class="comment-meta">
                            <span class="comment-name">{{ c.userName }}</span>
                            <span class="comment-time">{{ formatTime(c.createTime) }}</span>
                        </div>
                    </div>

                    <p v-if="c.parentId > 0" class="comment-reply-to">
                        回复
                        <span class="comment-reply-name">
                            {{ c.replyUserName || ('用户 ' + c.replyUserId) }}
                        </span>
                    </p>

                    <p class="comment-text">{{ c.text }}</p>

                    <div v-if="splitPictures(c.picture).length" class="comment-pictures">
                        <img
                            v-for="pic in splitPictures(c.picture)"
                            :key="pic"
                            :src="pic"
                            alt="评论图片"
                            class="comment-pic"
                        />
                    </div>

                    <div class="comment-actions">
                        <button
                            v-if="c.replyUserId || c.replyUserName"
                            class="comment-view-replies"
                            @click="openConversation(c)"
                        >
                            查看该评论之前的互动
                        </button>
                        <button class="comment-reply-btn" @click="openReply(c)">
                            回复
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 查看对话弹窗 -->
        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="showConversation" class="dialog-overlay" @click.self="closeConversation">
                    <div class="dialog-card conversation-dialog">
                        <h2 class="dialog-title">该评论之前的互动</h2>

                        <div v-if="conversationLoading" class="conversation-loading">加载中...</div>
                        <div v-else-if="conversationError" class="conversation-error">
                            {{ conversationError }}
                        </div>
                        <div v-else class="conversation-list">
                            <div v-for="m in conversationList" :key="m.id" class="conversation-item">
                                <p v-if="m.replyUserId || m.replyUserName" class="comment-reply-to">
                                    回复
                                    <span class="comment-reply-name">
                                        {{ m.replyUserName || ('用户 ' + m.replyUserId) }}
                                    </span>
                                </p>
                                <p class="conversation-text">{{ m.text }}</p>
                                <span class="conversation-meta">
                                    用户 {{ m.userId }} · {{ formatTime(m.createTime) }}
                                </span>
                            </div>
                        </div>

                        <div class="dialog-actions">
                            <button class="btn-cancel" @click="closeConversation">关闭</button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- 回复弹窗 -->
        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="showReply" class="dialog-overlay" @click.self="closeReply">
                    <div class="dialog-card reply-dialog">
                        <h2 class="dialog-title">回复</h2>

                        <p v-if="replyTarget" class="reply-target">
                            回复
                            <span class="reply-target-name">
                                {{ replyTarget.userName || ('用户 ' + replyTarget.userId) }}
                            </span>
                        </p>

                        <textarea
                            v-model="replyText"
                            class="comment-input"
                            placeholder="写下你的回复..."
                            maxlength="500"
                        ></textarea>

                        <p v-if="replyError" class="comment-error">{{ replyError }}</p>

                        <div class="dialog-actions">
                            <button class="btn-cancel" @click="closeReply">取消</button>
                            <button
                                class="btn-submit"
                                :disabled="replySubmitting"
                                @click="submitReply"
                            >
                                {{ replySubmitting ? '回复中...' : '回复' }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { detailedTeamUp, joinTeamUp, addComment, selectComment, selectCommentInteraction } from '@/api/forum.ts'
import type { TeamUp, CommentVO } from '@/api/forum.ts'
import { getUserId } from '@/composables/useAuth'
import { resolveAvatar } from '@/utils/avatar'
import { toast } from '@/utils/message'

const route = useRoute()
const router = useRouter()

/* 得到传递的组团的id */
const id = route.params.id as string

/* 类型 key -> 中文名 */
const typeOptions = [
    { key: 'all', name: '全部' },
    { key: 'study', name: '自习' },
    { key: 'movie', name: '电影' },
    { key: 'dinner', name: '聚餐' },
    { key: 'carpool', name: '拼车' },
    { key: 'order', name: '拼单' },
    { key: 'game', name: '游戏' },
    { key: 'sport', name: '运动' },
    { key: 'travel', name: '旅行' },
    { key: 'other', name: '其他' },
]
const typeMap: Record<string, string> = Object.fromEntries(
    typeOptions.map((item) => [item.key, item.name]),
)

const detail = ref<TeamUp | null>(null)
const loading = ref(false)
const errorMsg = ref('')

/** 请求组团详情 */
const fetchDetail = async () => {
    loading.value = true
    errorMsg.value = ''
    try {
        const res = await detailedTeamUp(id)
        if (res.code === 1 && res.data) {
            detail.value = res.data
        } else {
            errorMsg.value = res.msg || '获取组团详情失败'
        }
    } catch {
        errorMsg.value = '网络异常，请稍后重试'
    } finally {
        loading.value = false
    }
}

/** 返回上一页 */
const goBack = () => {
    router.back()
}

/* ==================== 参加组团 ==================== */
const joining = ref(false)

/** 参加组团：后端 code 为 1 视为成功，成功后刷新当前网页 */
const handleJoin = async () => {
    if (!detail.value || detail.value.joined > 0 || joining.value) return
    joining.value = true
    try {
        const res = await joinTeamUp(id)
        if (res.code === 1) {
            window.location.reload()
        } else {
            toast.warning(res.msg || '参加失败')
        }
    } catch {
        toast.warning('参加失败，请稍后重试')
    } finally {
        joining.value = false
    }
}

// ==================== 组团评论 ====================
const comments = ref<CommentVO[]>([])
const commentLoading = ref(false)
const commentError = ref('')

/** 读取缓存的用户信息，用于补全评论人的昵称/头像 */
const readCachedUserInfo = () => {
    try {
        const cached = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
        return cached ? JSON.parse(cached) : null
    } catch {
        return null
    }
}

const currentUserInfo = readCachedUserInfo()
const currentUserId = currentUserInfo?.userId ?? getUserId()

/** 请求组团评论列表 */
const fetchComments = async () => {
    commentLoading.value = true
    commentError.value = ''
    try {
        const res = await selectComment(Number(id))
        if (res.code === 1 && res.data) {
            comments.value = (res.data.rows || []).map((c) => ({ ...c, userAvatar: resolveAvatar(c.userAvatar) }))
        } else {
            commentError.value = res.msg || '获取评论失败'
        }
    } catch {
        commentError.value = '评论加载失败，请稍后重试'
    } finally {
        commentLoading.value = false
    }
}

/** 发表评论 */
const commentText = ref('')
const commentSubmitting = ref(false)

const formatNow = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const submitComment = async () => {
    const text = commentText.value.trim()
    if (!text) {
        commentError.value = '请输入评论内容'
        return
    }
    if (!currentUserId) {
        commentError.value = '请先登录后再评论'
        return
    }
    commentSubmitting.value = true
    commentError.value = ''
    try {
        const res = await addComment({
            teamupId: Number(id),
            parentId: 0,
            text,
            picture: '',
            son: 0,
            createTime: formatNow(),
            userId: currentUserId,
            replyUserId: null,
        })
        if (res.code === 1) {
            commentText.value = ''
            await fetchComments()
        } else {
            commentError.value = res.msg || '评论失败'
        }
    } catch {
        commentError.value = '评论失败，请稍后重试'
    } finally {
        commentSubmitting.value = false
    }
}

/** 回复评论 */
const showReply = ref(false)
const replyTarget = ref<CommentVO | null>(null)
const replyText = ref('')
const replySubmitting = ref(false)
const replyError = ref('')

const openReply = (comment: CommentVO) => {
    replyTarget.value = comment
    replyText.value = ''
    replyError.value = ''
    showReply.value = true
}

const closeReply = () => {
    showReply.value = false
}

const submitReply = async () => {
    const text = replyText.value.trim()
    if (!text) {
        replyError.value = '请输入回复内容'
        return
    }
    if (!replyTarget.value) return
    if (!currentUserId) {
        replyError.value = '请先登录后再回复'
        return
    }
    replySubmitting.value = true
    replyError.value = ''
    try {
        // 回复评论/回复的回复：parentId 传被回复评论的 id，replyUserId 传被回复用户的 id
        const res = await addComment({
            teamupId: Number(id),
            parentId: replyTarget.value.id,
            text,
            picture: '',
            son: 0,
            createTime: formatNow(),
            userId: currentUserId,
            replyUserId: replyTarget.value.userId,
        })
        if (res.code === 1) {
            replyText.value = ''
            showReply.value = false
            await fetchComments()
        } else {
            replyError.value = res.msg || '回复失败'
        }
    } catch {
        replyError.value = '回复失败，请稍后重试'
    } finally {
        replySubmitting.value = false
    }
}

/** 查看对话 */
const showConversation = ref(false)
const conversationLoading = ref(false)
const conversationError = ref('')
const conversationList = ref<CommentVO[]>([])

const openConversation = async (comment: CommentVO) => {
    showConversation.value = true
    conversationLoading.value = true
    conversationError.value = ''
    conversationList.value = []
    try {
        // 后端该接口参数名写的是 teamUpId，实际按评论 id 查询互动链路
        const res = await selectCommentInteraction(comment.id)
        if (res.code === 1 && res.data) {
            conversationList.value = res.data.rows || []
        } else {
            conversationError.value = res.msg || '获取对话失败'
        }
    } catch {
        conversationError.value = '获取对话失败，请稍后重试'
    } finally {
        conversationLoading.value = false
    }
}

const closeConversation = () => {
    showConversation.value = false
}

/** 评论图片可能是逗号分隔的多张 */
const splitPictures = (picture: string) => {
    return picture ? picture.split(',').filter(Boolean) : []
}

/** 用户名首字母（无头像时兜底） */
const avatarInitial = (name: string) => (name || '?').charAt(0).toUpperCase()

/** 将后端时间（可能是 2026-08-14T01:38:40）格式化为易读的 yyyy-MM-dd HH:mm */
const formatTime = (time?: string) => {
    if (!time) return ''
    return time.replace('T', ' ').slice(0, 16)
}

onMounted(() => {
    fetchDetail()
    fetchComments()
})
</script>

<style scoped>
/* ============================================
   Apple Design System — TeamUpScan 组团详情
   参考: {colors}, {typography}, {rounded}, {spacing}
   ============================================ */

.team-up-scan {
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

/* ---------- 顶栏：返回按钮 + 类型徽章 ---------- */
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
    margin-bottom: 0;
    transition: opacity 0.15s ease;
}

.btn-back:hover {
    opacity: 0.7;
}

.back-arrow {
    font-size: 24px;
    line-height: 1;
}

/* ---------- 类型徽章 ---------- */
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
    margin-bottom: 0;
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
}

/* ---------- 信息列表 ---------- */
.detail-info-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-top: 1px solid #e0e0e0;
}

.info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid #e0e0e0;
}

.info-row:last-child {
    border-bottom: none;
}

.info-label {
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
}

/* 已参与状态高亮 */
.info-value--joined {
    color: #0066cc;
}

/* ---------- 参加组团按钮 ---------- */
.join-bar {
    display: flex;
    justify-content: center;
    margin-top: 28px;
}

.btn-join {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 160px;
    height: 48px;
    padding: 0 32px;
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
    transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
}

.btn-join:hover:not(:disabled) {
    background: #0071e3;
}

.btn-join:active:not(:disabled) {
    transform: scale(0.95);
}

.btn-join:disabled {
    cursor: not-allowed;
}

/* 已参与：置灰禁用 */
.btn-join--joined {
    color: #86868b;
    background: #f5f5f7;
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

/* 发表评论 */
.comment-composer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
}

.comment-input {
    width: 100%;
    min-height: 96px;
    padding: 14px 16px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.47;
    color: #1d1d1f;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 14px;
    outline: none;
    resize: vertical;
    transition: border-color 0.2s ease;
}

.comment-input:focus {
    border-color: #0066cc;
}

.comment-input::placeholder {
    color: #7a7a7a;
}

.comment-submit {
    align-self: flex-end;
    height: 40px;
    padding: 0 24px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 15px;
    font-weight: 500;
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

.comment-submit:hover {
    background: #0071e3;
}

.comment-submit:active {
    transform: scale(0.96);
}

.comment-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.comment-error {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: #ff3b30;
    margin: 0 0 12px;
}

.comment-loading,
.comment-empty {
    padding: 40px 0;
    text-align: center;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 15px;
    color: #7a7a7a;
}

/* 瀑布流布局 */
.comment-masonry {
    column-count: 1;
    column-gap: 16px;
}

.comment-card {
    break-inside: avoid;
    margin-bottom: 16px;
    padding: 20px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 18px;
}

.comment-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.comment-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: #f5f5f7;
}

.comment-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    background: #0066cc;
    font-size: 16px;
    font-weight: 600;
}

.comment-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.comment-name {
    font-size: 15px;
    font-weight: 600;
    color: #1d1d1f;
}

.comment-time {
    font-size: 12px;
    color: #7a7a7a;
}

.comment-text {
    font-size: 15px;
    line-height: 1.5;
    color: #1d1d1f;
    margin: 0 0 12px;
    white-space: pre-wrap;
    word-break: break-word;
}

.comment-pictures {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.comment-pic {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 10px;
}

.comment-view-replies {
    display: inline-flex;
    align-items: center;
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
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.comment-view-replies:hover {
    background: rgba(0, 102, 204, 0.14);
}

.comment-view-replies:active {
    transform: scale(0.96);
}

.comment-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.comment-reply-btn {
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 16px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #7a7a7a;
    background: #f5f5f7;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.comment-reply-btn:hover {
    background: #ececee;
}

.comment-reply-btn:active {
    transform: scale(0.96);
}

.comment-reply-to {
    font-size: 13px;
    color: #7a7a7a;
    margin: 0 0 8px;
}

.comment-reply-name {
    color: #0066cc;
    font-weight: 500;
}

/* ---------- 查看对话弹窗 ---------- */
.dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.dialog-card {
    width: 100%;
    max-width: 420px;
    margin: 24px;
    background: #ffffff;
    border-radius: 20px;
    padding: 28px 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.conversation-dialog {
    max-height: 80vh;
    overflow-y: auto;
}

.dialog-title {
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.18;
    letter-spacing: 0.196px;
    color: #1d1d1f;
    margin: 0 0 20px;
    text-align: center;
}

.reply-target {
    font-size: 14px;
    color: #7a7a7a;
    margin: 0 0 12px;
}

.reply-target-name {
    color: #0066cc;
    font-weight: 500;
}

.conversation-loading,
.conversation-error {
    padding: 24px 0;
    text-align: center;
    font-size: 15px;
    color: #7a7a7a;
}

.conversation-error {
    color: #ff3b30;
}

.conversation-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 50vh;
    overflow-y: auto;
}

.conversation-item {
    padding: 14px 16px;
    background: #f5f5f7;
    border-radius: 12px;
}

.conversation-text {
    font-size: 15px;
    line-height: 1.5;
    color: #1d1d1f;
    margin: 0 0 6px;
    white-space: pre-wrap;
    word-break: break-word;
}

.conversation-meta {
    font-size: 12px;
    color: #7a7a7a;
}

.dialog-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
}

.btn-cancel {
    flex: 1;
    height: 44px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: #0066cc;
    background: transparent;
    border: 1px solid #0066cc;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.btn-cancel:hover {
    background: rgba(0, 102, 204, 0.08);
}

.btn-cancel:active {
    transform: scale(0.96);
}

.btn-submit {
    flex: 1;
    height: 44px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: #ffffff;
    background: #0066cc;
    border: 1px solid #0066cc;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.btn-submit:hover {
    background: #0071e3;
    border-color: #0071e3;
}

.btn-submit:active {
    transform: scale(0.96);
}

.btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* 弹窗过渡动画 */
.dialog-enter-active,
.dialog-leave-active {
    transition: opacity 0.25s ease;
}

.dialog-enter-active .dialog-card,
.dialog-leave-active .dialog-card {
    transition: transform 0.25s ease, opacity 0.25s ease;
}

.dialog-enter-from,
.dialog-leave-to {
    opacity: 0;
}

.dialog-enter-from .dialog-card,
.dialog-leave-to .dialog-card {
    transform: scale(0.95);
    opacity: 0;
}

/* ---------- 响应式 ---------- */
@media (min-width: 641px) {
    .detail-card {
        padding: 40px 36px;
    }

    .detail-title {
        font-size: 34px;
    }

    .comment-masonry {
        column-count: 2;
    }
}
</style>
