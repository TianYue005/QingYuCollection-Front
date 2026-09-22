<template>
    <div class="search-box">
        <input type="text" placeholder="搜一搜" v-model="keyword" @keyup.enter="handleSearch">
        <button @click="handleSearch">搜索</button>
    </div>
    <div class="circle">
        <!-- 导航标签栏：查看按钮 -->
        <nav class="tab-bar">
            <button v-for="value in viewButtons" :key="value.id" class="tab-chip" :class="{ active: activeTab === value.id }"
                @click="buttonLogic(value.id)">
                {{ value.title }}
            </button>
        </nav>
        <!-- 导航标签栏：操作按钮（添加动态 / 发布任务 / 创建活动） -->
        <nav class="tab-bar tab-bar--action">
            <button v-for="value in actionButtons" :key="value.id" class="tab-chip action-chip"
                @click="buttonLogic(value.id)">
                {{ value.title }}
            </button>
        </nav>
        <!-- 分割线 -->
        <div class="divider"></div>
        <!-- 路由展示界面 -->
        <div class="content-area">
            <router-view />
        </div>
    </div>

    <!-- 添加动态弹窗 -->
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="dialog.addDynamic" class="modal-overlay" @click.self="dialog.addDynamic = false">
                <div class="modal-card">
                    <div class="modal-header">
                        <h3 class="modal-title">添加动态</h3>
                        <p class="modal-desc">分享你的校园生活</p>
                        <button class="modal-close" @click="dialog.addDynamic = false" aria-label="关闭">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="input-group">
                            <label class="input-label">动态类型</label>
                            <select v-model="dynamicForm.type" class="custom-input custom-select">
                                <option value="求助">求助</option>
                                <option value="吐槽">吐槽</option>
                                <option value="一起拼单">一起拼单</option>
                                <option value="避雷">避雷</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label class="input-label">动态内容</label>
                            <textarea v-model="dynamicForm.content" class="custom-input custom-textarea" placeholder="请输入动态内容" rows="4"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-cancel" @click="dialog.addDynamic = false">取消</button>
                        <button class="modal-btn modal-btn-confirm" @click="submitDynamic">发布</button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>

    <!-- 发布任务弹窗 -->
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="dialog.publishTask" class="modal-overlay" @click.self="dialog.publishTask = false">
                <div class="modal-card">
                    <div class="modal-header">
                        <h3 class="modal-title">发布任务</h3>
                        <p class="modal-desc">填写跑腿任务信息，等待同学接单</p>
                        <button class="modal-close" @click="dialog.publishTask = false" aria-label="关闭">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="input-group">
                            <label class="input-label">任务类型</label>
                            <select v-model="taskForm.type" class="custom-input custom-select">
                                <option value="代取快递">代取快递</option>
                                <option value="帮带饭">帮带饭</option>
                                <option value="代打印">代打印</option>
                                <option value="其他">其他</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label class="input-label">赏金（元）</label>
                            <input v-model.number="taskForm.bounty" type="number" min="0" step="1" class="custom-input" placeholder="请输入赏金金额" />
                        </div>
                        <div class="input-group">
                            <label class="input-label">任务要求</label>
                            <textarea v-model="taskForm.requestContent" class="custom-input custom-textarea" placeholder="请描述任务的具体内容" rows="3"></textarea>
                        </div>
                        <div class="input-group">
                            <label class="input-label">备注</label>
                            <textarea v-model="taskForm.note" class="custom-input custom-textarea" placeholder="补充说明（选填）" rows="2"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-cancel" @click="dialog.publishTask = false">取消</button>
                        <button class="modal-btn modal-btn-confirm" @click="submitTask">发布</button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>

    <!-- 创建活动弹窗 -->
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="dialog.createActivity" class="modal-overlay" @click.self="dialog.createActivity = false">
                <div class="modal-card">
                    <div class="modal-header">
                        <h3 class="modal-title">创建活动</h3>
                        <p class="modal-desc">发起一场新的校园活动</p>
                        <button class="modal-close" @click="dialog.createActivity = false" aria-label="关闭">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="input-group">
                            <label class="input-label">活动标题</label>
                            <input v-model="activityForm.title" type="text" class="custom-input" placeholder="请输入活动标题" />
                        </div>
                        <div class="input-group">
                            <label class="input-label">活动图片</label>
                            <div class="upload-area" :class="{ 'has-images': activityPictures.length > 0 }"
                                @click="triggerActivityUpload">
                                <input ref="activityFileInputRef" type="file"
                                    accept=".jpg,.jpeg,.png,.apng,.gif,.bmp" multiple style="display: none"
                                    @change="handleActivityFileChange" />
                                <div v-if="activityPictures.length === 0" class="upload-placeholder">
                                    <span class="upload-text">{{ activityUploading ? '上传中...' : '点击上传活动图片（选填）' }}</span>
                                    <span class="upload-hint">支持 JPG / PNG / GIF 等，最多 {{ MAX_ACTIVITY_IMAGES }} 张</span>
                                </div>
                                <div v-else class="preview-grid" @click.stop>
                                    <div v-for="(url, index) in activityPictures" :key="index" class="preview-item">
                                        <img :src="url" alt="活动图片预览" />
                                        <span class="remove-btn" @click="removeActivityPicture(index)">&times;</span>
                                    </div>
                                    <div v-if="activityUploading" class="upload-add upload-add--loading">
                                        <span class="upload-add-text">上传中</span>
                                    </div>
                                    <div v-else-if="activityPictures.length < MAX_ACTIVITY_IMAGES" class="upload-add"
                                        @click.stop="triggerActivityUpload">
                                        <span class="upload-add-icon">+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="input-group">
                            <label class="input-label">开始时间</label>
                            <input v-model="activityForm.startTime" type="date" class="custom-input" />
                        </div>
                        <div class="input-group">
                            <label class="input-label">结束时间</label>
                            <input v-model="activityForm.endTime" type="date" class="custom-input" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-cancel" @click="dialog.createActivity = false">取消</button>
                        <button class="modal-btn modal-btn-confirm" @click="submitActivity">创建</button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
<script setup lang="ts">
import { ref, reactive, watch, provide, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router'
import { toast } from '@/utils/message'
import { addCircleDynamic, addCircleTask, addCircleActivity } from '@/api/forum'
import { uploadImages } from '@/api/item'
const router = useRouter() // 跳转
const route = useRoute()//参数
const activeTab = ref(1);
// 搜索关键词（透传给子路由，由子组件决定走搜索接口还是分页接口）
const keyword = ref('');
// 发布成功后自增，通知子组件刷新列表
const refreshSignal = ref(0);
provide('circleRefreshSignal', refreshSignal);

/** 组装子路由 query：保留当前搜索关键词 */
const buildQuery = (base: Record<string, string>) => {
    const kw = keyword.value.trim()
    return kw ? { ...base, keyword: kw } : { ...base }
}

/** 根据当前激活标签，把关键词写回对应子路由 */
const handleSearch = () => {
    if (activeTab.value === 3) {
        router.push({ name: 'Events', query: buildQuery({}) })
    } else {
        const option = activeTab.value === 2 ? 'ErrandTask' : 'CircleUpdates'
        router.push({ name: 'Dynamic', query: buildQuery({ option }) })
    }
}

//查看按钮
const viewButtons = [
    { id: 1, title: "圈子动态" },
    { id: 2, title: "跑腿任务" },
    { id: 3, title: "热门活动" },
];
//操作按钮（不参与查看高亮切换）
const actionButtons = [
    { id: 4, title: "添加动态" },
    { id: 5, title: "发布任务" },
    { id: 6, title: "创建活动" },
];
//按钮绑定逻辑
const buttonLogic = (id: number) => {
    if (id === 1) {
        //圈子
        activeTab.value = id;
        router.push(
            {
                name: 'Dynamic',
                query: buildQuery({
                    option: 'CircleUpdates'
                })
            }
        )
    } else if (id === 2) {
        //跑腿任务
        activeTab.value = id;
        router.push(
            {
                name: 'Dynamic',
                query: buildQuery({
                    option: 'ErrandTask'
                })
            }
        )
    } else if (id === 3) {
        //热门活动
        activeTab.value = id;
        router.push(
            {
                name: 'Events',
                query: buildQuery({})
            }
        )
    } else if (id === 4) {
        //添加动态功能
        dialog.addDynamic = true
    } else if (id === 5) {
        //发布任务功能
        dialog.publishTask = true
    } else if (id === 6) {
        //创建任务功能
        dialog.createActivity = true
    }
};

// 根据当前路由同步高亮标签（直接访问 Events/Dynamic 链接时也能正确高亮）
const syncTabFromRoute = () => {
    if (route.name === 'Events') {
        activeTab.value = 3
    } else if (route.name === 'Dynamic') {
        activeTab.value = route.query.option === 'ErrandTask' ? 2 : 1
    }
}
watch(() => route.name, syncTabFromRoute, { immediate: true })

// ===== 弹窗控制 =====
const dialog = reactive({
    addDynamic: false, //添加动态
    publishTask: false, //发布任务
    createActivity: false, //创建活动
})

// ===== 表单数据（将来提交到后端接口） =====
//添加动态
const dynamicForm = reactive({
    type: '求助', //动态类型
    content: '', //动态内容
})
//发布任务
const taskForm = reactive({
    type: '代取快递', //任务类型
    bounty: 0, //赏金
    requestContent: '', //任务要求
    note: '', //备注
})
//创建活动
const activityForm = reactive({
    title: '', //活动标题
    startTime: '', //开始时间
    endTime: '', //结束时间
})

// ===== 创建活动 — 图片上传 =====
// 图片先调 /upload 上传接口拿到 url，提交表单时把 url 拼接成字符串传给后端
const MAX_ACTIVITY_IMAGES = 5
const ACTIVITY_ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.apng', '.gif', '.bmp']
const activityFileInputRef = ref<HTMLInputElement | null>(null)
// 已上传成功的图片 url 列表
const activityPictures = ref<string[]>([])
const activityUploading = ref(false)

// 触发文件选择
const triggerActivityUpload = () => {
    if (activityUploading.value) return
    if (activityPictures.value.length >= MAX_ACTIVITY_IMAGES) {
        toast.warning(`最多只能上传 ${MAX_ACTIVITY_IMAGES} 张图片`)
        return
    }
    activityFileInputRef.value?.click()
}

// 选中图片后立即上传，避免提交表单时再等待
const handleActivityFileChange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const files = Array.from(target.files || [])
    target.value = '' // 清空以便重复选择同一文件
    if (files.length === 0) return

    const remaining = MAX_ACTIVITY_IMAGES - activityPictures.value.length
    const validFiles = files.slice(0, remaining).filter((file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!ACTIVITY_ALLOWED_EXTS.includes(ext)) {
            toast.warning(`${file.name} 格式不支持，已跳过`)
            return false
        }
        return true
    })
    if (validFiles.length === 0) return

    activityUploading.value = true
    try {
        const res = await uploadImages(validFiles)
        if (res.code === 1 && res.data) {
            activityPictures.value.push(...res.data.map((pic) => pic.url))
        } else {
            toast.error(res.msg || '图片上传失败')
        }
    } catch {
        toast.error('图片上传失败，请稍后重试')
    } finally {
        activityUploading.value = false
    }
}

// 移除已上传的图片
const removeActivityPicture = (index: number) => {
    activityPictures.value.splice(index, 1)
}

// Esc 键关闭弹窗
const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        dialog.addDynamic = false
        dialog.publishTask = false
        dialog.createActivity = false
    }
}
watch(dialog, (val) => {
    const open = val.addDynamic || val.publishTask || val.createActivity
    if (open) {
        document.addEventListener('keydown', onKeydown)
    } else {
        document.removeEventListener('keydown', onKeydown)
    }
})
onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown)
})

// ===== 表单提交 =====
const submitDynamic = async () => {
    if (!dynamicForm.content.trim()) {
        toast.warning('请输入动态内容')
        return
    }
    try {
        // 后端 add 接口以 @RequestBody 接收，userId 由后端从登录态填充
        const res = await addCircleDynamic({
            type: dynamicForm.type,
            content: dynamicForm.content.trim(),
        })
        if (res.code === 1) {
            toast.success('动态发布成功')
            dialog.addDynamic = false
            dynamicForm.content = ''
            refreshSignal.value++ // 通知列表刷新
        } else {
            toast.error(res.msg || '动态发布失败')
        }
    } catch {
        toast.error('动态发布失败，请稍后重试')
    }
}

const submitTask = async () => {
    if (!taskForm.requestContent.trim()) {
        toast.warning('请输入任务要求')
        return
    }
    if (!Number.isInteger(taskForm.bounty)) {
        toast.warning('赏金必须为整数')
        return
    }
    if (taskForm.bounty < 0) {
        toast.warning('赏金不能为负数')
        return
    }
    try {
        // 后端 add 接口以 @RequestBody 接收，userId 由后端从登录态填充
        const res = await addCircleTask({
            type: taskForm.type,
            bounty: taskForm.bounty,
            requestContent: taskForm.requestContent.trim(),
            note: taskForm.note.trim(),
        })
        if (res.code === 1) {
            toast.success('任务发布成功')
            dialog.publishTask = false
            taskForm.requestContent = ''
            taskForm.note = ''
            taskForm.bounty = 0
            refreshSignal.value++ // 通知列表刷新
        } else {
            toast.error(res.msg || '任务发布失败')
        }
    } catch {
        toast.error('任务发布失败，请稍后重试')
    }
}

const submitActivity = async () => {
    if (!activityForm.title.trim()) {
        toast.warning('请输入活动标题')
        return
    }
    if (!activityForm.startTime || !activityForm.endTime) {
        toast.warning('请选择活动起止时间')
        return
    }
    if (activityUploading.value) {
        toast.warning('图片上传中，请稍候')
        return
    }
    try {
        // 后端 add 接口以 @RequestBody 接收，userId 由后端从登录态填充
        // picture 传上传接口返回的图片 url（多张用 "," 拼接）
        const res = await addCircleActivity({
            title: activityForm.title.trim(),
            picture: activityPictures.value.join(','),
            startTime: activityForm.startTime,
            endTime: activityForm.endTime,
        })
        if (res.code === 1) {
            toast.success('活动创建成功')
            dialog.createActivity = false
            activityForm.title = ''
            activityForm.startTime = ''
            activityForm.endTime = ''
            activityPictures.value = []
            refreshSignal.value++ // 通知列表刷新
        } else {
            toast.error(res.msg || '活动创建失败')
        }
    } catch {
        toast.error('活动创建失败，请稍后重试')
    }
}

</script>
<style scoped>
/* ============================================
   Apple Design System — Circle 圈子
   参考: {colors}, {typography}, {rounded}, {spacing}
   ============================================ */

/* ============================================
   搜索框 — search-input
   参考: {component.search-input} + {component.button-primary}
   ============================================ */
.search-box {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 980px;
    margin: 80px auto 24px;
    padding: 0 24px;
}

.search-box input {
    flex: 1;
    height: 44px;
    padding: 0 20px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #1d1d1f;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 9999px;
    outline: none;
    transition: border-color 0.2s ease;
}

.search-box input::placeholder {
    color: #7a7a7a;
}

.search-box input:focus {
    border-color: #0066cc;
}

.search-box button {
    height: 44px;
    padding: 0 22px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #ffffff;
    background: #0066cc;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s ease, transform 0.1s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.search-box button:hover {
    background: #0071e3;
}

.search-box button:active {
    transform: scale(0.95);
}

.search-box button:focus-visible {
    outline: 2px solid #0071e3;
    outline-offset: 2px;
}

/* ---------- 容器 ---------- */
.circle {
    max-width: 980px;
    margin: 0 auto;
    padding: 80px 24px 48px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    color: #1d1d1f;
}

/* ============================================
   导航标签栏 — tab-bar
   参考: configurator-option-chip
   ============================================ */
.tab-bar {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 12px;
}

/* 操作按钮行（添加动态 / 发布任务 / 创建活动） */
.tab-bar--action {
    margin-bottom: 28px;
}

.tab-chip {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.29;
    letter-spacing: -0.224px;
    color: #1d1d1f;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 9999px;
    padding: 10px 22px;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
}

.tab-chip:hover {
    border-color: #0066cc;
    color: #0066cc;
}

.tab-chip:active {
    transform: scale(0.95);
}

.tab-chip:focus-visible {
    outline: 2px solid #0071e3;
    outline-offset: 2px;
}

/* 选中态 — 参考 configurator-option-chip-selected */
.tab-chip.active {
    background: #0066cc;
    color: #ffffff;
    border-color: #0066cc;
}

.tab-chip.active:hover {
    background: #0071e3;
    border-color: #0071e3;
    color: #ffffff;
}

/* 操作按钮 — 添加动态 / 发布任务 / 创建活动
   与查看按钮区分：不参与 activeTab 高亮，点击后不保持变色 */
.action-chip {
    background: #ffffff;
    color: #0066cc;
    border-color: #0066cc;
}

.action-chip:hover {
    background: #0066cc;
    border-color: #0066cc;
    color: #ffffff;
}

/* ============================================
   分割线 — divider
   ============================================ */
.divider {
    height: 1px;
    background: #e0e0e0;
    margin: 0 0 40px 0;
}

/* ============================================
   内容区域 — content-area
   ============================================ */
.content-area {
    min-height: 320px;
}

/* ============================================
   响应式 — 参考 Apple 断点
   ============================================ */
@media (min-width: 641px) {
    .tab-bar {
        gap: 12px;
    }

    .tab-chip {
        padding: 10px 26px;
    }
}

/* ============================================
   Modal 弹窗 — 参考 Profile.vue 已完成代码
   ============================================ */
.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 20px;
}

.modal-card {
    background: #ffffff;
    border-radius: 20px;
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.15),
        0 0 0 0.5px rgba(0, 0, 0, 0.06);
}

/* ---- Modal Header ---- */
.modal-header {
    position: relative;
    padding: 28px 28px 0;
    text-align: center;
}

.modal-title {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: 0.216px;
    color: #1d1d1f;
    margin: 0 0 6px;
}

.modal-desc {
    font-size: 15px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.24px;
    color: #7a7a7a;
    margin: 0;
}

.modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: #f5f5f7;
    color: #7a7a7a;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.15s ease, color 0.15s ease;
}

.modal-close:hover {
    background: #f0f0f0;
    color: #1d1d1f;
}

/* ---- Modal Body ---- */
.modal-body {
    padding: 24px 28px 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.input-label {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.29;
    letter-spacing: -0.224px;
    color: #333333;
}

.custom-input {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: -0.32px;
    color: #1d1d1f;
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1.5px solid #e0e0e0;
    background: #f5f5f7;
    outline: none;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
}

.custom-input::placeholder {
    color: #7a7a7a;
}

.custom-input:focus {
    border-color: #0066cc;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.12);
}

.custom-textarea {
    resize: vertical;
    min-height: 60px;
}

.custom-select {
    cursor: pointer;
}

/* ---- 创建活动：图片上传 ---- */
.upload-area {
    border: 1.5px dashed #d2d2d7;
    border-radius: 12px;
    background: #f5f5f7;
    padding: 14px;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;
}

.upload-area:hover {
    border-color: #0066cc;
    background: #ffffff;
}

.upload-area.has-images {
    cursor: default;
    border-style: solid;
}

.upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 0;
    text-align: center;
}

.upload-text {
    font-size: 14px;
    color: #333333;
}

.upload-hint {
    font-size: 12px;
    color: #7a7a7a;
}

.preview-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.preview-item {
    position: relative;
    width: 84px;
    height: 84px;
    border-radius: 10px;
    overflow: hidden;
    background: #ffffff;
    border: 1px solid #e0e0e0;
}

.preview-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    color: #ffffff;
    font-size: 14px;
    line-height: 16px;
    text-align: center;
    cursor: pointer;
}

.remove-btn:hover {
    background: rgba(0, 0, 0, 0.75);
}

.upload-add {
    width: 84px;
    height: 84px;
    border-radius: 10px;
    border: 1.5px dashed #d2d2d7;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease;
}

.upload-add:hover {
    border-color: #0066cc;
    color: #0066cc;
}

.upload-add-icon {
    font-size: 26px;
    line-height: 1;
    color: #7a7a7a;
}

.upload-add--loading {
    cursor: default;
    border-style: solid;
}

.upload-add-text {
    font-size: 12px;
    color: #7a7a7a;
}

/* ---- Modal Footer ---- */
.modal-footer {
    display: flex;
    gap: 12px;
    padding: 28px;
}

.modal-btn {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: -0.32px;
    flex: 1;
    padding: 12px 20px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition:
        transform 0.1s ease,
        background-color 0.15s ease;
}

.modal-btn:active {
    transform: scale(0.97);
}

.modal-btn-cancel {
    background: #f5f5f7;
    color: #333333;
}

.modal-btn-cancel:hover {
    background: #f0f0f0;
}

.modal-btn-confirm {
    background: #0066cc;
    color: #ffffff;
}

.modal-btn-confirm:hover {
    background: #0071e3;
}

.modal-btn-confirm:focus-visible {
    outline: 2px solid #0071e3;
    outline-offset: 2px;
}

/* ---- Modal Transition ---- */
.modal-fade-enter-active {
    transition: opacity 0.25s ease;
}

.modal-fade-enter-active .modal-card {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-leave-active .modal-card {
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-fade-enter-from {
    opacity: 0;
}

.modal-fade-enter-from .modal-card {
    transform: scale(0.92) translateY(12px);
    opacity: 0;
}

.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-leave-to .modal-card {
    transform: scale(0.95);
    opacity: 0;
}

/* ---- Modal 移动端适配 ---- */
@media (max-width: 640px) {
    .modal-header {
        padding: 24px 20px 0;
    }

    .modal-body {
        padding: 20px 20px 0;
        gap: 14px;
    }

    .modal-footer {
        padding: 24px 20px;
    }

    .modal-title {
        font-size: 21px;
    }
}
</style>