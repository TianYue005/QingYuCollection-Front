<template>
    <Teleport to="body">
        <Transition name="report-dialog">
            <div v-if="visible" class="report-overlay" @click.self="close">
                <div class="report-card">
                    <h3 class="report-title">举报</h3>

                    <p class="report-target">举报对象：{{ label }}</p>

                    <textarea
                        v-model="reason"
                        class="report-input"
                        placeholder="请填写举报理由..."
                        maxlength="200"
                    ></textarea>

                    <p v-if="errorMsg" class="report-error">{{ errorMsg }}</p>

                    <div class="report-actions">
                        <button class="report-btn-cancel" @click="close">取消</button>
                        <button
                            class="report-btn-submit"
                            :disabled="submitting"
                            @click="submit"
                        >
                            {{ submitting ? '提交中...' : '提交举报' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { reportComment } from '@/api/item'
import { getUserId } from '@/composables/useAuth'
import { toast } from '@/utils/message'

/**
 * 通用举报弹窗：点击后填写举报理由并提交到 /items/reportComment
 * type 取值：2 组团、3 组团发言、4 圈子动态、5 圈子动态评论、
 *           6 跑腿任务、7 跑腿任务评论、8 热门活动、9 热门活动评论
 */
const props = defineProps<{
    visible: boolean
    /** 举报对象展示文案 */
    label: string
    /** 所在对象类型 */
    reportType: number
    /** 举报对象 id（组团 id / 评论 id 等） */
    reportId: number | string
    /** 所在对象 id（组团 id / 圈子动态 id 等） */
    objectId: number | string
    /** 举报对象的内容 */
    report: string
}>()

const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const reason = ref('')
const errorMsg = ref('')
const submitting = ref(false)

// 每次打开时清空上一次的填写内容
watch(
    () => props.visible,
    (val) => {
        if (val) {
            reason.value = ''
            errorMsg.value = ''
            submitting.value = false
        }
    },
)

const close = () => {
    emit('update:visible', false)
}

const submit = async () => {
    const text = reason.value.trim()
    if (!text) {
        errorMsg.value = '请填写举报理由'
        return
    }
    if (!getUserId()) {
        errorMsg.value = '请先登录后再举报'
        return
    }
    submitting.value = true
    errorMsg.value = ''
    try {
        const res = await reportComment({
            report: props.report,
            reportId: props.reportId,
            objectId: props.objectId,
            type: props.reportType,
            reason: text,
        })
        if (res.code === 1) {
            emit('update:visible', false)
            toast.success('举报已提交')
        } else {
            errorMsg.value = res.msg || '举报失败'
        }
    } catch {
        errorMsg.value = '举报失败，请稍后重试'
    } finally {
        submitting.value = false
    }
}
</script>

<style scoped>
.report-overlay {
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

.report-card {
    width: 100%;
    max-width: 420px;
    margin: 24px;
    background: #ffffff;
    border-radius: 20px;
    padding: 24px 22px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    color: #1d1d1f;
}

.report-title {
    margin: 0 0 16px;
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 20px;
    font-weight: 600;
    text-align: center;
    color: #1d1d1f;
}

.report-target {
    margin: 0 0 12px;
    font-size: 14px;
    color: #7a7a7a;
    word-break: break-word;
}

.report-input {
    width: 100%;
    min-height: 88px;
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
    box-sizing: border-box;
    transition: border-color 0.2s ease;
}

.report-input:focus {
    border-color: #0066cc;
}

.report-input::placeholder {
    color: #7a7a7a;
}

.report-error {
    margin: 10px 0 0;
    font-size: 14px;
    color: #ff3b30;
}

.report-actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
}

.report-btn-cancel,
.report-btn-submit {
    flex: 1;
    height: 42px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 15px;
    font-weight: 500;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
}

.report-btn-cancel {
    color: #0066cc;
    background: transparent;
    border: 1px solid #0066cc;
}

.report-btn-cancel:hover {
    background: rgba(0, 102, 204, 0.08);
}

.report-btn-submit {
    color: #ffffff;
    background: #0066cc;
    border: 1px solid #0066cc;
}

.report-btn-submit:hover {
    background: #0071e3;
    border-color: #0071e3;
}

.report-btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.report-dialog-enter-active,
.report-dialog-leave-active {
    transition: opacity 0.25s ease;
}

.report-dialog-enter-active .report-card,
.report-dialog-leave-active .report-card {
    transition: transform 0.25s ease, opacity 0.25s ease;
}

.report-dialog-enter-from,
.report-dialog-leave-to {
    opacity: 0;
}

.report-dialog-enter-from .report-card,
.report-dialog-leave-to .report-card {
    transform: scale(0.95);
    opacity: 0;
}
</style>
