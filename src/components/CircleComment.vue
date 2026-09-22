<template>
    <div class="circle-comment">
        <!-- 发表评论 -->
        <div class="cc-composer">
            <textarea
                v-model="commentText"
                class="cc-input"
                placeholder="写下你的评论..."
                maxlength="500"
            ></textarea>
            <button class="cc-submit" :disabled="commentSubmitting" @click="submitComment">
                {{ commentSubmitting ? '发布中...' : '发布' }}
            </button>
        </div>
        <p v-if="commentError" class="cc-error">{{ commentError }}</p>

        <!-- 加载状态 -->
        <div v-if="commentLoading" class="cc-loading">加载中...</div>

        <!-- 空状态 -->
        <div v-else-if="comments.length === 0" class="cc-empty">还没有评论，快来抢沙发~</div>

        <!-- 评论列表（父评论与回复按层级缩进展示） -->
        <div v-else class="cc-list">
            <div
                v-for="c in comments"
                :key="c.id"
                class="cc-card"
                :class="depthClass(c)"
            >
                <div class="cc-head">
                    <img
                        v-if="c.userAvatar"
                        :src="c.userAvatar"
                        alt="头像"
                        class="cc-avatar"
                    />
                    <span v-else class="cc-avatar cc-avatar-fallback">
                        {{ avatarInitial(c.userName) }}
                    </span>
                    <div class="cc-meta">
                        <span class="cc-name">{{ c.userName }}</span>
                        <span class="cc-time">{{ formatTime(c.createTime) }}</span>
                    </div>
                </div>

                <p v-if="c.parentId > 0" class="cc-reply-to">
                    回复
                    <span class="cc-reply-name">
                        {{ c.replyUserName || ('用户 ' + c.replyUserId) }}
                    </span>
                </p>

                <p class="cc-text">{{ c.text }}</p>

                <div v-if="splitPictures(c.picture).length" class="cc-pictures">
                    <img
                        v-for="pic in splitPictures(c.picture)"
                        :key="pic"
                        :src="pic"
                        alt="评论图片"
                        class="cc-pic"
                    />
                </div>

                <div class="cc-actions">
                    <button
                        v-if="c.replyUserId || c.replyUserName"
                        class="cc-interaction-btn"
                        @click="openInteraction(c)"
                    >
                        查看该评论之前的互动
                    </button>
                    <button class="cc-reply-btn" @click="openReply(c)">回复</button>
                    <span v-if="c.son > 0" class="cc-son-count">{{ c.son }} 条回复</span>
                </div>
            </div>
        </div>

        <!-- 回复弹窗 -->
        <Teleport to="body">
            <Transition name="cc-dialog">
                <div v-if="showReply" class="cc-overlay" @click.self="closeReply">
                    <div class="cc-dialog-card">
                        <h3 class="cc-dialog-title">回复</h3>

                        <p v-if="replyTarget" class="cc-reply-target">
                            回复
                            <span class="cc-reply-target-name">
                                {{ replyTarget.userName || ('用户 ' + replyTarget.userId) }}
                            </span>
                        </p>

                        <textarea
                            v-model="replyText"
                            class="cc-input"
                            placeholder="写下你的回复..."
                            maxlength="500"
                        ></textarea>

                        <p v-if="replyError" class="cc-error">{{ replyError }}</p>

                        <div class="cc-dialog-actions">
                            <button class="cc-btn-cancel" @click="closeReply">取消</button>
                            <button class="cc-btn-submit" :disabled="replySubmitting" @click="submitReply">
                                {{ replySubmitting ? '回复中...' : '回复' }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- 互动弹窗 -->
        <Teleport to="body">
            <Transition name="cc-dialog">
                <div v-if="showInteraction" class="cc-overlay" @click.self="closeInteraction">
                    <div class="cc-dialog-card">
                        <h3 class="cc-dialog-title">该评论之前的互动</h3>

                        <div v-if="interactionLoading" class="cc-loading">加载中...</div>
                        <div v-else-if="interactionError" class="cc-interaction-error">
                            {{ interactionError }}
                        </div>
                        <div v-else class="cc-interaction-list">
                            <div v-for="m in interactionList" :key="m.id" class="cc-interaction-item">
                                <p v-if="m.replyUserId || m.replyUserName" class="cc-reply-to">
                                    回复
                                    <span class="cc-reply-name">
                                        {{ m.replyUserName || ('用户 ' + m.replyUserId) }}
                                    </span>
                                </p>
                                <p class="cc-interaction-text">{{ m.text }}</p>
                                <span class="cc-interaction-meta">
                                    用户 {{ m.userId }} · {{ formatTime(m.createTime) }}
                                </span>
                            </div>
                        </div>

                        <div class="cc-dialog-actions">
                            <button class="cc-btn-cancel" @click="closeInteraction">关闭</button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { addCircleComment, selectCircleComment, selectCircleCommentInteraction } from '@/api/forum'
import type { CommentCircleVO } from '@/api/forum'
import { getUserId } from '@/composables/useAuth'
import { resolveAvatar } from '@/utils/avatar'

const props = defineProps<{ circleId: number | string }>()

const comments = ref<CommentCircleVO[]>([])
const commentLoading = ref(false)
const commentError = ref('')

/** 读取缓存的用户信息，用于登录态判断 */
const readCachedUserInfo = () => {
    try {
        const cached = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
        return cached ? JSON.parse(cached) : null
    } catch {
        return null
    }
}

const currentUserId = readCachedUserInfo()?.userId ?? getUserId()

const fetchComments = async () => {
    // 后端 selectCircleComment 强制要求必传 circleId，缺失时不发起请求
    if (!props.circleId) {
        commentError.value = '缺少圈子 id，无法加载评论'
        return
    }
    commentLoading.value = true
    commentError.value = ''
    try {
        const res = await selectCircleComment(props.circleId)
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

const submitComment = async () => {
    const text = commentText.value.trim()
    if (!text) {
        commentError.value = '请输入评论内容'
        return
    }
    if (!props.circleId) {
        commentError.value = '缺少圈子 id，无法发表评论'
        return
    }
    if (!currentUserId) {
        commentError.value = '请先登录后再评论'
        return
    }
    commentSubmitting.value = true
    commentError.value = ''
    try {
        const res = await addCircleComment({
            circleId: props.circleId,
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
const replyTarget = ref<CommentCircleVO | null>(null)
const replyText = ref('')
const replySubmitting = ref(false)
const replyError = ref('')

const openReply = (comment: CommentCircleVO) => {
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
    if (!props.circleId) {
        replyError.value = '缺少圈子 id，无法回复'
        return
    }
    if (!currentUserId) {
        replyError.value = '请先登录后再回复'
        return
    }
    replySubmitting.value = true
    replyError.value = ''
    try {
        const res = await addCircleComment({
            circleId: props.circleId,
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

/** 查看该评论之前的互动 */
const showInteraction = ref(false)
const interactionLoading = ref(false)
const interactionError = ref('')
const interactionList = ref<CommentCircleVO[]>([])

const openInteraction = async (comment: CommentCircleVO) => {
    showInteraction.value = true
    interactionLoading.value = true
    interactionError.value = ''
    interactionList.value = []
    try {
        const res = await selectCircleCommentInteraction(comment.id)
        if (res.code === 1 && res.data) {
            interactionList.value = res.data.rows || []
        } else {
            interactionError.value = res.msg || '获取互动失败'
        }
    } catch {
        interactionError.value = '获取互动失败，请稍后重试'
    } finally {
        interactionLoading.value = false
    }
}

const closeInteraction = () => {
    showInteraction.value = false
}

const splitPictures = (picture: string) => {
    return picture ? picture.split(',').filter(Boolean) : []
}

const avatarInitial = (name: string) => (name || '?').charAt(0).toUpperCase()

/** 根据 parentId 链路计算评论层级深度，用于缩进展示（最多缩进 3 层） */
const depthClass = (c: CommentCircleVO): string => {
    const idMap = new Map<number, CommentCircleVO>()
    comments.value.forEach((item) => idMap.set(item.id, item))
    let depth = 0
    const seen = new Set<number>()
    let parentId = c.parentId
    while (parentId > 0 && idMap.has(parentId) && !seen.has(parentId)) {
        seen.add(parentId)
        depth++
        parentId = idMap.get(parentId)!.parentId
    }
    return `cc-depth-${Math.min(depth, 3)}`
}

/** 当前时间 yyyy-MM-dd HH:mm:ss（与后端 CommentCircle.createTime 格式对齐） */
const formatNow = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const formatTime = (time?: string) => {
    if (!time) return ''
    return time.replace('T', ' ').slice(0, 16)
}

onMounted(() => {
    fetchComments()
})

// 当切换不同圈子的评论面板时重新加载
watch(() => props.circleId, () => {
    fetchComments()
})
</script>

<style scoped>
.circle-comment {
    padding: 16px 0 0;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    margin-top: 16px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    color: #1d1d1f;
}

/* 发表评论 */
.cc-composer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
}

.cc-input {
    width: 100%;
    min-height: 84px;
    padding: 12px 14px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 15px;
    line-height: 1.47;
    color: #1d1d1f;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 12px;
    outline: none;
    resize: vertical;
    transition: border-color 0.2s ease;
}

.cc-input:focus {
    border-color: #0066cc;
}

.cc-input::placeholder {
    color: #7a7a7a;
}

.cc-submit {
    align-self: flex-end;
    height: 36px;
    padding: 0 20px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
    background: #0066cc;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
}

.cc-submit:hover {
    background: #0071e3;
}

.cc-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.cc-error {
    font-size: 14px;
    color: #ff3b30;
    margin: 0 0 10px;
}

.cc-loading,
.cc-empty {
    padding: 28px 0;
    text-align: center;
    font-size: 14px;
    color: #7a7a7a;
}

/* 评论列表（纵向排列，回复按层级缩进） */
.cc-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 层级缩进（最多 3 层） */
.cc-depth-1 { margin-left: 28px; }
.cc-depth-2 { margin-left: 56px; }
.cc-depth-3 { margin-left: 84px; }

.cc-card {
    padding: 14px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 14px;
}

.cc-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.cc-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: #f5f5f7;
}

.cc-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    background: #0066cc;
    font-size: 14px;
    font-weight: 600;
}

.cc-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.cc-name {
    font-size: 14px;
    font-weight: 600;
    color: #1d1d1f;
}

.cc-time {
    font-size: 12px;
    color: #7a7a7a;
}

.cc-reply-to {
    font-size: 13px;
    color: #7a7a7a;
    margin: 0 0 6px;
}

.cc-reply-name {
    color: #0066cc;
    font-weight: 500;
}

.cc-text {
    font-size: 15px;
    line-height: 1.5;
    color: #1d1d1f;
    margin: 0 0 10px;
    white-space: pre-wrap;
    word-break: break-word;
}

.cc-pictures {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
}

.cc-pic {
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: 8px;
}

.cc-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.cc-interaction-btn,
.cc-reply-btn {
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 14px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 500;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
}

.cc-interaction-btn {
    color: #0066cc;
    background: rgba(0, 102, 204, 0.08);
}

.cc-interaction-btn:hover {
    background: rgba(0, 102, 204, 0.14);
}

.cc-reply-btn {
    color: #7a7a7a;
    background: #f5f5f7;
}

.cc-reply-btn:hover {
    background: #ececee;
}

/* 回复数量徽章 */
.cc-son-count {
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 14px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #7a7a7a;
    background: #f5f5f7;
    border-radius: 9999px;
    user-select: none;
}

/* 弹窗 */
.cc-overlay {
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

.cc-dialog-card {
    width: 100%;
    max-width: 420px;
    margin: 24px;
    background: #ffffff;
    border-radius: 20px;
    padding: 24px 22px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    max-height: 80vh;
    overflow-y: auto;
}

.cc-dialog-title {
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 20px;
    font-weight: 600;
    color: #1d1d1f;
    margin: 0 0 16px;
    text-align: center;
}

.cc-reply-target {
    font-size: 14px;
    color: #7a7a7a;
    margin: 0 0 10px;
}

.cc-reply-target-name {
    color: #0066cc;
    font-weight: 500;
}

.cc-dialog-actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
}

.cc-btn-cancel,
.cc-btn-submit {
    flex: 1;
    height: 42px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 15px;
    font-weight: 500;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
}

.cc-btn-cancel {
    color: #0066cc;
    background: transparent;
    border: 1px solid #0066cc;
}

.cc-btn-cancel:hover {
    background: rgba(0, 102, 204, 0.08);
}

.cc-btn-submit {
    color: #ffffff;
    background: #0066cc;
    border: 1px solid #0066cc;
}

.cc-btn-submit:hover {
    background: #0071e3;
    border-color: #0071e3;
}

.cc-btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.cc-interaction-error {
    padding: 20px 0;
    text-align: center;
    font-size: 14px;
    color: #ff3b30;
}

.cc-interaction-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 50vh;
    overflow-y: auto;
}

.cc-interaction-item {
    padding: 12px 14px;
    background: #f5f5f7;
    border-radius: 12px;
}

.cc-interaction-text {
    font-size: 15px;
    line-height: 1.5;
    color: #1d1d1f;
    margin: 0 0 4px;
    white-space: pre-wrap;
    word-break: break-word;
}

.cc-interaction-meta {
    font-size: 12px;
    color: #7a7a7a;
}

/* 弹窗过渡 */
.cc-dialog-enter-active,
.cc-dialog-leave-active {
    transition: opacity 0.25s ease;
}

.cc-dialog-enter-active .cc-dialog-card,
.cc-dialog-leave-active .cc-dialog-card {
    transition: transform 0.25s ease, opacity 0.25s ease;
}

.cc-dialog-enter-from,
.cc-dialog-leave-to {
    opacity: 0;
}

.cc-dialog-enter-from .cc-dialog-card,
.cc-dialog-leave-to .cc-dialog-card {
    transform: scale(0.95);
    opacity: 0;
}
</style>
