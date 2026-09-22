<template>
    <div class="team-up">
        <!-- 搜索框 -->
        <div class="search-box">
            <input type="text" placeholder="搜一搜" v-model="keyword" @keyup.enter="handleSearch">
            <button @click="handleSearch">搜索</button>
        </div>
        <!-- 组团操作 -->
        <div class="action-bar">
            <button @click="actionTab = 'create', teamUp(1)" :class="{ active: actionTab === 'create' }"
                class="btn-action">发起组团</button>
        </div>
        <!-- 分割区域 -->
        <div class="divider"></div>
        <!-- 组团标签 -->
        <div class="tag-bar">
            <button v-for="item in typeOptions" :key="item.key" @click="handleClick(item.key)"
                :class="{ active: currentKey === item.key }" class="tag-chip">
                {{ item.name }}
            </button>
        </div>
        <!-- 展示界面 -->
        <!-- 空白提示 -->
        <div v-show="show()" class="empty-state">
            <img src="/Doubt.svg" alt="图片加载失败" class="empty-image">
            <h2 class="empty-title">喔嚯，好像没有这个东东 ~ ~</h2>
            <h3 class="empty-subtitle">--快来分享有趣的事情吧--</h3>
        </div>
        <!-- 具体信息展示 -->
        <div class="group-list" v-show="!show()">
            <div v-for="value in Information" :key="value.id" class="group-card" @click="touchGroup(value)">
                <span class="group-card-type">{{ typeMap[value.type] || value.type }}</span>
                <div class="group-card-body">
                    <span class="group-card-title">{{ value.title }}</span>
                    <span class="group-card-meta">团长：{{ value.leaderName || value.leader }} &middot; {{ value.startTime
                    }}</span>
                </div>
            </div>
        </div>
        <!-- 加载更多 -->
        <div ref="sentinelRef" class="load-more">
            <span v-if="loading">加载中...</span>
            <span v-else-if="!hasMore && rawList.length > 0">没有更多了</span>
        </div>

        <!-- 发起组团弹窗 -->
        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="showCreate" class="dialog-overlay" @click.self="closeCreate">
                    <div class="dialog-card create-dialog">
                        <h2 class="dialog-title">发起组团</h2>
                        <div class="form-field">
                            <label class="form-label" for="create-type">类型</label>
                            <select id="create-type" class="form-select" v-model="createForm.type">
                                <option value="" disabled>请选择组团类型</option>
                                <option v-for="item in createTypeOptions" :key="item.key" :value="item.key">
                                    {{ item.name }}
                                </option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label class="form-label" for="create-title">标题</label>
                            <input id="create-title" class="form-input" type="text" placeholder="请输入组团标题"
                                v-model="createForm.title" maxlength="50">
                        </div>
                        <div class="form-field">
                            <label class="form-label" for="create-people">最大参与人数</label>
                            <input id="create-people" class="form-input" type="number" min="1" :max="MAX_PEOPLE_NUMBER"
                                placeholder="请输入人数（不可大于 10 人）" v-model.number="createForm.peopleNumber"
                                @blur="handlePeopleNumberBlur">
                        </div>
                        <div class="form-field">
                            <label class="form-label" for="create-time">开始时间</label>
                            <input id="create-time" class="form-input" type="datetime-local"
                                v-model="createForm.startTime">
                        </div>
                        <p v-if="createError" class="form-error">{{ createError }}</p>
                        <div class="dialog-actions">
                            <button class="btn-cancel" :disabled="submitting" @click="closeCreate">取消</button>
                            <button class="btn-submit" :disabled="submitting" @click="submitCreate">
                                {{ submitting ? '提交中...' : '发起组团' }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>
<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { getTeamUp, addTeamUp, searchTeamUp } from '@/api/forum.ts'
import type { TeamUp } from '@/api/forum.ts'
import { useRouter } from 'vue-router'
const router = useRouter()

const currentKey = ref("all");
const keyword = ref('');
const actionTab = ref('create');

const typeOptions = [
    { key: "all", name: "全部" },
    { key: "study", name: "自习" },
    { key: "movie", name: "电影" },
    { key: "dinner", name: "聚餐" },
    { key: "carpool", name: "拼车" },
    { key: "order", name: "拼单" },
    { key: "game", name: "游戏" },
    { key: "sport", name: "运动" },
    { key: "travel", name: "旅行" },
    { key: "other", name: "其他" },
];
// 类型 key -> 中文名，用于卡片类型徽章展示
const typeMap: Record<string, string> = Object.fromEntries(
    typeOptions.map((item) => [item.key, item.name])
);

// ==================== 发起组团 ====================
// 最大参与人数上限（后端限制不可大于 10 人）
const MAX_PEOPLE_NUMBER = 10;
const showCreate = ref(false);
const submitting = ref(false);
const createError = ref('');
const createForm = ref({
    type: '',
    title: '',
    peopleNumber: 1,
    startTime: '',
});
// 可选类型（排除"全部"）
const createTypeOptions = typeOptions.filter((item) => item.key !== 'all');

const openCreate = () => {
    createForm.value = { type: '', title: '', peopleNumber: 1, startTime: '' };
    createError.value = '';
    showCreate.value = true;
};

const closeCreate = () => {
    if (submitting.value) return;
    showCreate.value = false;
};

/** 人数输入框失焦校验：必须大于 0 且小于等于 10，否则自动回退为 1 */
const handlePeopleNumberBlur = () => {
    const value = createForm.value.peopleNumber;
    if (!Number.isInteger(value) || value < 1 || value > MAX_PEOPLE_NUMBER) {
        createForm.value.peopleNumber = 1;
    }
};

/** 回到第一页重新加载 */
const reloadFirstPage = async () => {
    page.value = 1;
    rawList.value = [];
    hasMore.value = true;
    await fetchPage();
};

const submitCreate = async () => {
    const { type, title, peopleNumber, startTime } = createForm.value;
    if (!type) { createError.value = '请选择组团类型'; return; }
    if (!title.trim()) { createError.value = '请输入组团标题'; return; }
    if (!Number.isInteger(peopleNumber) || peopleNumber < 1) {
        createError.value = '最大参与人数必须为不小于 1 的整数';
        return;
    }
    if (peopleNumber > MAX_PEOPLE_NUMBER) {
        createError.value = `最大参与人数不可大于 ${MAX_PEOPLE_NUMBER} 人`;
        return;
    }
    if (!startTime) { createError.value = '请选择开始时间'; return; }
    submitting.value = true;
    createError.value = '';
    try {
        // 后端 add 接口以 @RequestBody 接收；leader/leaderName/createAt/updateAt 均由后端填充
        const res = await addTeamUp({
            type,
            title: title.trim(),
            peopleNumber,
            // datetime-local 输出 "yyyy-MM-ddTHH:mm"，替换为后端时间格式
            startTime: startTime.replace('T', ' '),
        });
        if (res.code === 1) {
            showCreate.value = false;
            await reloadFirstPage();
        } else {
            createError.value = res.msg || '发起组团失败';
        }
    } catch {
        createError.value = '发起组团失败，请稍后重试';
    } finally {
        submitting.value = false;
    }
};

// ==================== 分页加载 ====================
// 关键词搜索走后端 /forum/search；类型筛选：切换标签时携带 type 请求后端
const rawList = ref<TeamUp[]>([]); // 服务端已加载的全部数据
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const loading = ref(false);
const hasMore = ref(true);

/**
 * 当前展示列表
 * 主列表由后端按 type 过滤；关键词搜索结果（/forum/search 不支持 type）仍在此按类型兜底过滤
 */
const Information = computed<TeamUp[]>(() => {
    const kw = keyword.value.trim().toLowerCase();
    return rawList.value.filter((item) => {
        // 类型兜底过滤（主列表后端已过滤，主要作用于关键词搜索结果）
        if (currentKey.value !== 'all' && item.type !== currentKey.value) return false;
        if (!kw) return true;
        // 关键词筛选：匹配标题 / 团长名 / 团长ID
        return (
            item.title?.toLowerCase().includes(kw) ||
            item.leaderName?.toLowerCase().includes(kw) ||
            String(item.leader).includes(kw)
        );
    });
});

const fetchPage = async (isLoadMore = false) => {
    if (loading.value) return;
    loading.value = true;
    try {
        // 关键词搜索：走后端 /forum/search（按标题模糊匹配，固定返回第一页 10 条）
        if (keyword.value.trim()) {
            const res = await searchTeamUp(keyword.value.trim());
            if (res.code === 1 && res.data) {
                total.value = Number(res.data.total);
                rawList.value = res.data.rows;
                hasMore.value = false;
            }
            return;
        }
        const res = await getTeamUp({
            pageNumber: page.value,
            pageSize,
            // "全部" 不传 type，其余类型把按钮 key 作为 type 传给后端过滤
            type: currentKey.value === 'all' ? undefined : currentKey.value,
        });
        if (res.code === 1 && res.data) {
            total.value = Number(res.data.total);
            // 按 id 去重，避免分页加载时重复数据
            const existingIds = new Set(rawList.value.map((item) => item.id));
            const mapped = res.data.rows.filter((item) => !existingIds.has(item.id));
            if (isLoadMore) {
                rawList.value.push(...mapped);
            } else {
                rawList.value = mapped;
            }
            hasMore.value = rawList.value.length < total.value;
        }
    } catch (e) {
        console.error('获取组团列表失败', e);
    } finally {
        loading.value = false;
    }
};

// ==================== 事件处理 ====================
const handleClick = (key: string) => {
    if (currentKey.value === key) return;
    currentKey.value = key;//切换按钮时的CSS样式
    reloadFirstPage();//切换分类：携带 type 重新请求后端，回到第一页
}

const handleSearch = () => {
    // 关键词搜索走后端 /forum/search，回到第一页重新请求
    reloadFirstPage();
}

const teamUp = (option: number) => {
    if (option === 1) {
        //发起组团按钮
        openCreate();
    }
}

// 是否有数据（请求中不显示空白提示，避免闪烁）
const show = (): boolean => Information.value.length === 0 && !loading.value;

const touchGroup = (item: TeamUp) => {
    //点击陈列的列表进行的请求以及跳转逻辑（需配合组团详情接口/路由使用）
    router.push({ name: 'TeamUpScan', params: { id: item.id } })
}

// ==================== 无限滚动加载 ====================
const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function setupObserver() {
    if (!sentinelRef.value) return;
    observer = new IntersectionObserver(
        (entries) => {
            if (entries[0]?.isIntersecting && hasMore.value && !loading.value) {
                page.value++;
                fetchPage(true);
            }
        },
        { rootMargin: '100px' }
    );
    observer.observe(sentinelRef.value);
}

onMounted(() => {
    fetchPage();
    nextTick(setupObserver);
});

onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
});
</script>
<style scoped>
/* ============================================
   Apple Design System — TeamUp 组团
   参考: {colors}, {typography}, {rounded}, {spacing}
   ============================================ */

/* ---------- 容器 ---------- */
.team-up {
    max-width: 980px;
    margin: 0 auto;
    padding: 80px 24px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    color: #1d1d1f;
}

/* ============================================
   搜索框 — search-input
   参考: {component.search-input} + {component.button-primary}
   ============================================ */
.search-box {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
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

/* ============================================
   操作按钮栏 — action-bar
   ============================================ */
.action-bar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 48px;
}

/* 操作按钮 — 默认: ghost pill（参考 button-secondary-pill） */
.btn-action {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #0066cc;
    background: transparent;
    border: 1px solid #0066cc;
    border-radius: 9999px;
    padding: 11px 22px;
    width: 100%;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.btn-action:hover {
    background: rgba(0, 102, 204, 0.08);
}

.btn-action:active {
    transform: scale(0.95);
}

.btn-action:focus-visible {
    outline: 2px solid #0071e3;
    outline-offset: 2px;
}

/* 选中态 — 反转为填充（参考 button-primary） */
.btn-action.active {
    color: #ffffff;
    background: #0066cc;
    border-color: #0066cc;
}

.btn-action.active:hover {
    background: #0071e3;
    border-color: #0071e3;
    color: #ffffff;
}

/* ============================================
   分割线 — divider
   ============================================ */
.divider {
    height: 1px;
    background: #e0e0e0;
    margin: 0 0 32px 0;
}

/* ============================================
   标签栏 — tag-bar（参考 configurator-option-chip）
   ============================================ */
.tag-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 32px;
}

.tag-chip {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.29;
    letter-spacing: -0.224px;
    color: #1d1d1f;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 9999px;
    padding: 8px 18px;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.tag-chip:hover {
    border-color: #0066cc;
    color: #0066cc;
}

.tag-chip:active {
    transform: scale(0.95);
}

/* 选中态 — 参考 configurator-option-chip-selected */
.tag-chip.active {
    background: #0066cc;
    color: #ffffff;
    border-color: #0066cc;
}

.tag-chip.active:hover {
    background: #0071e3;
    border-color: #0071e3;
    color: #ffffff;
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
   组团卡片列表 — group-list
   参考: store-utility-card（白色卡片 + hairline 边框）
   ============================================ */
.group-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.group-card {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 24px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.group-card:hover {
    border-color: #0066cc;
    transform: translateY(-1px);
}

.group-card:active {
    transform: scale(0.985);
}

/* 类型徽章 */
.group-card-type {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 52px;
    height: 28px;
    padding: 4px 12px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.0;
    letter-spacing: -0.12px;
    color: #0066cc;
    background: rgba(0, 102, 204, 0.08);
    border-radius: 9999px;
    white-space: nowrap;
    margin-top: 2px;
}

/* 卡片右侧主体 */
.group-card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

/* 标题 — 参考 typography.body-strong */
.group-card-title {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.24;
    letter-spacing: -0.374px;
    color: #1d1d1f;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 辅助信息 — 参考 typography.caption */
.group-card-meta {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.43;
    letter-spacing: -0.224px;
    color: #7a7a7a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
   发起组团弹窗 — dialog
   ============================================ */
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
    max-width: 380px;
    margin: 24px;
    background: #ffffff;
    border-radius: 20px;
    padding: 32px 28px 28px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.dialog-title {
    font-family: "SF Pro Display", system-ui, -apple-system, sans-serif;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.17;
    letter-spacing: 0.196px;
    color: #1d1d1f;
    margin: 0 0 24px 0;
    text-align: center;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
}

.form-label {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.29;
    letter-spacing: -0.224px;
    color: #1d1d1f;
}

.form-input,
.form-select {
    height: 44px;
    padding: 0 16px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    color: #1d1d1f;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 12px;
    outline: none;
    transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus {
    border-color: #0066cc;
}

.form-error {
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.43;
    letter-spacing: -0.224px;
    color: #ff3b30;
    margin: 0 0 16px 0;
}

.dialog-actions {
    display: flex;
    gap: 12px;
}

.btn-cancel,
.btn-submit {
    flex: 1;
    height: 44px;
    font-family: "SF Pro Text", system-ui, -apple-system, sans-serif;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    border-radius: 9999px;
    cursor: pointer;
    outline: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.2s ease, transform 0.1s ease;
}

.btn-cancel {
    color: #0066cc;
    background: transparent;
    border: 1px solid #0066cc;
}

.btn-cancel:hover {
    background: rgba(0, 102, 204, 0.08);
}

.btn-submit {
    color: #ffffff;
    background: #0066cc;
    border: 1px solid #0066cc;
}

.btn-submit:hover {
    background: #0071e3;
    border-color: #0071e3;
}

.btn-cancel:active,
.btn-submit:active {
    transform: scale(0.96);
}

.btn-cancel:disabled,
.btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ---- 弹窗过渡动画 ---- */
.dialog-enter-active {
    transition: opacity 0.3s ease;
}

.dialog-enter-active .dialog-card {
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}

.dialog-leave-active {
    transition: opacity 0.2s ease;
}

.dialog-leave-active .dialog-card {
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from {
    opacity: 0;
}

.dialog-enter-from .dialog-card {
    transform: scale(0.85);
    opacity: 0;
}

.dialog-leave-to {
    opacity: 0;
}

.dialog-leave-to .dialog-card {
    transform: scale(0.9);
    opacity: 0;
}

/* ============================================
   响应式 — 参考 Apple 断点
   ============================================ */
@media (min-width: 641px) {
    .action-bar {
        flex-direction: row;
    }

    .btn-action {
        width: auto;
        flex: 1;
    }

    .empty-state {
        padding: 80px 48px;
    }
}

@media (min-width: 834px) {
    .group-card {
        padding: 24px 28px;
    }
}
</style>