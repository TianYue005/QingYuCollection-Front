<template>
  <div class="profile-page">
    <!-- 头部卡片：头像 + 基本信息 -->
    <div class="profile-card hero-card">
      <div class="avatar-section">
        <div class="avatar-wrapper">
          <img v-if="avatar" :src="avatar" alt="用户头像" class="avatar-img" />
          <div v-else class="avatar-placeholder">
            {{ (username || '用户').charAt(0) }}
          </div>
          <button class="avatar-edit-btn" aria-label="修改头像">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div class="hero-info">
        <h2 class="hero-username">{{ username }}</h2>
        <p class="hero-account">{{ account }}</p>
        <span class="status-badge" :class="status === 1 ? 'status-active' : 'status-frozen'">
          {{ status === 1 ? '正常' : '已冻结' }}
        </span>
      </div>
    </div>

    <!-- 信息列表卡片 -->
    <div class="profile-card info-card">
      <h3 class="card-title">基本信息</h3>
      <ul class="info-list">
        <li class="info-item">
          <span class="info-label">用户ID</span>
          <span class="info-value">{{ userId }}</span>
        </li>
        <li class="info-item">
          <span class="info-label">用户名</span>
          <div class="info-value-row">
            <span class="info-value">{{ username }}</span>
            <button class="text-link">修改</button>
          </div>
        </li>
        <li class="info-item">
          <span class="info-label">账号</span>
          <span class="info-value">{{ account }}</span>
        </li>
        <li class="info-item">
          <span class="info-label">状态</span>
          <div class="info-value-row">
            <span class="info-value" :class="status === 1 ? 'text-active' : 'text-frozen'">
              {{ status === 1 ? '正常' : '已冻结' }}
            </span>
            <button v-if="status !== 1" class="text-link">申诉</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 数据概览卡片 -->
    <div class="profile-card stats-card">
      <h3 class="card-title">数据概览</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">{{ level }}</span>
          <span class="stat-label">账号等级</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ credit }}</span>
          <span class="stat-label">信誉积分</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value stat-balance">{{ balance }}</span>
          <span class="stat-label">用户金额</span>
        </div>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="profile-card action-card">
      <button class="action-btn action-btn-primary" @click="handlePasswordChange = true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M14.25 6.75L9 12L3.75 6.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
        修改密码
      </button>
    </div>

    <!-- 退出登录 -->
    <div class="profile-card logout-card">
      <button class="action-btn action-btn-danger" @click="showLogoutConfirm = true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11.25 4.5V3.75C11.25 3.33579 10.9142 3 10.5 3H4.5C4.08579 3 3.75 3.33579 3.75 3.75V14.25C3.75 14.6642 4.08579 15 4.5 15H10.5C10.9142 15 11.25 14.6642 11.25 14.25V13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M14.25 9H7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M12 6.75L14.25 9L12 11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        退出登录
      </button>
    </div>

    <!-- 修改密码弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="handlePasswordChange" class="modal-overlay" @click.self="handlePasswordChange = false">
          <div class="modal-card">
            <!-- 头部 -->
            <div class="modal-header">
              <h3 class="modal-title">修改密码</h3>
              <p class="modal-desc">请设置一个新的安全密码</p>
              <button class="modal-close" @click="handlePasswordChange = false" aria-label="关闭">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <!-- 表单 -->
            <div class="modal-body">
              <div class="input-group">
                <label class="input-label">旧密码</label>
                <div class="input-wrapper">
                  <input
                    v-model="passwordForm.oldPassword"
                    :type="showOldPassword ? 'text' : 'password'"
                    class="custom-input"
                    placeholder="请输入旧密码"
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    class="input-eye"
                    @click="showOldPassword = !showOldPassword"
                    :aria-label="showOldPassword ? '隐藏密码' : '显示密码'"
                  >
                    <svg v-if="showOldPassword" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10C2 10 5.5 4 10 4C14.5 4 18 10 18 10C18 10 14.5 16 10 16C5.5 16 2 10 2 10Z" stroke="currentColor" stroke-width="1.5"/>
                      <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3.5 3.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <path d="M8 8C8.61538 7.40385 9.61538 7 10 7C12 7 13 8.5 13 10C13 10.3846 12.5962 11.3846 12 12" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M5.5 13C3.5 11.5 2 10 2 10C2 10 5.5 4 10 4C11.5 4 13 4.5 14.5 5.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M13.5 16C12.5 16.5 11.5 17 10 17C5.5 17 2 12.5 2 12.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M18 7.5C17.5 6.5 16 5 14 4L17 7.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M10 4L18 10" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">新密码</label>
                <div class="input-wrapper">
                  <input
                    v-model="passwordForm.newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    class="custom-input"
                    placeholder="请输入新密码"
                    autocomplete="new-password"
                  />
                  <button
                    type="button"
                    class="input-eye"
                    @click="showNewPassword = !showNewPassword"
                    :aria-label="showNewPassword ? '隐藏密码' : '显示密码'"
                  >
                    <svg v-if="showNewPassword" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10C2 10 5.5 4 10 4C14.5 4 18 10 18 10C18 10 14.5 16 10 16C5.5 16 2 10 2 10Z" stroke="currentColor" stroke-width="1.5"/>
                      <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3.5 3.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <path d="M8 8C8.61538 7.40385 9.61538 7 10 7C12 7 13 8.5 13 10C13 10.3846 12.5962 11.3846 12 12" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M5.5 13C3.5 11.5 2 10 2 10C2 10 5.5 4 10 4C11.5 4 13 4.5 14.5 5.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M13.5 16C12.5 16.5 11.5 17 10 17C5.5 17 2 12.5 2 12.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M18 7.5C17.5 6.5 16 5 14 4L17 7.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M10 4L18 10" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">确认密码</label>
                <div class="input-wrapper">
                  <input
                    v-model="passwordForm.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    class="custom-input"
                    placeholder="请再次输入新密码"
                    autocomplete="new-password"
                  />
                  <button
                    type="button"
                    class="input-eye"
                    @click="showConfirmPassword = !showConfirmPassword"
                    :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'"
                  >
                    <svg v-if="showConfirmPassword" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10C2 10 5.5 4 10 4C14.5 4 18 10 18 10C18 10 14.5 16 10 16C5.5 16 2 10 2 10Z" stroke="currentColor" stroke-width="1.5"/>
                      <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3.5 3.5L16.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <path d="M8 8C8.61538 7.40385 9.61538 7 10 7C12 7 13 8.5 13 10C13 10.3846 12.5962 11.3846 12 12" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M5.5 13C3.5 11.5 2 10 2 10C2 10 5.5 4 10 4C11.5 4 13 4.5 14.5 5.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M13.5 16C12.5 16.5 11.5 17 10 17C5.5 17 2 12.5 2 12.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M18 7.5C17.5 6.5 16 5 14 4L17 7.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M10 4L18 10" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- 底部按钮 -->
            <div class="modal-footer">
              <button class="modal-btn modal-btn-cancel" @click="handlePasswordChange = false">取消</button>
              <button class="modal-btn modal-btn-confirm" @click="submitPasswordForm">确认修改</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 退出登录确认弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showLogoutConfirm" class="modal-overlay" @click.self="showLogoutConfirm = false">
          <div class="modal-card">
            <!-- 头部 -->
            <div class="modal-header">
              <h3 class="modal-title">退出登录</h3>
              <p class="modal-desc">确定要退出当前账号吗？</p>
              <button class="modal-close" @click="showLogoutConfirm = false" aria-label="关闭">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <!-- 底部按钮 -->
            <div class="modal-footer">
              <button class="modal-btn modal-btn-cancel" @click="showLogoutConfirm = false">取消</button>
              <button class="modal-btn modal-btn-danger" @click="handleLogout">退出登录</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getAccount } from '@/composables/useAuth'
import { accountInfo, updatePassword, type UserAccountInfo } from '@/api/user'
import { ElMessage } from 'element-plus'
import { resolveAvatar } from '@/utils/avatar'

const router = useRouter()

const username = ref('')
const account = ref('')
const userId = ref<number | null>(null)
const avatar = ref<string | null>(null)
const status = ref(1)
const level = ref(1)
const credit = ref(100)
const balance = ref('0')
const handlePasswordChange = ref(false)
const showLogoutConfirm = ref(false)
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (handlePasswordChange.value) handlePasswordChange.value = false
    if (showLogoutConfirm.value) showLogoutConfirm.value = false
  }
}

watch([handlePasswordChange, showLogoutConfirm], ([passwordOpen, logoutOpen]) => {
  if (passwordOpen || logoutOpen) {
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

const submitPasswordForm = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.error('新密码和确认密码不一致')
    return
  }
  try {
    const res = await updatePassword(passwordForm.newPassword)
    if (res.code === 1) {
      ElMessage.success('密码修改成功')
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      handlePasswordChange.value = false
    } else {
      ElMessage.error(res.msg || '密码修改失败')
    }
  } catch (e) {
    console.error('修改密码失败：', e)
    ElMessage.error('密码修改失败')
  }
}


const handleLogout = () => {
  // 清除两个可能存储 Token / 用户信息的位置
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('account')
  localStorage.removeItem('userInfo')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('username')
  sessionStorage.removeItem('account')
  sessionStorage.removeItem('userInfo')
  showLogoutConfirm.value = false
  ElMessage.success('已退出登录')
  router.push({ name: 'login' })
}

const fetchAccountInfo = async () => {
  const acc = getAccount()
  if (!acc) return
  try {
    const res = await accountInfo(acc)
    if (res.code === 1 && res.data) {
      const data: UserAccountInfo = res.data
      username.value = data.userName
      account.value = data.account
      userId.value = data.userId
      status.value = data.status
      level.value = data.level
      credit.value = data.credit
      balance.value = data.balance
      avatar.value = resolveAvatar(data.avatar)
    }
  } catch (e) {
    console.error('获取账号信息失败：', e)
  }
}

onMounted(() => {
  fetchAccountInfo()
})
</script>

<style scoped>
/* ============================================
   Apple Design System — Profile Page
   ============================================ */

/* ---- Design Tokens ---- */
:root {
  --color-canvas: #ffffff;
  --color-canvas-parchment: #f5f5f7;
  --color-ink: #1d1d1f;
  --color-ink-muted-80: #333333;
  --color-ink-muted-48: #7a7a7a;
  --color-primary: #0066cc;
  --color-primary-focus: #0071e3;
  --color-hairline: #e0e0e0;
  --color-divider-soft: #f0f0f0;
  --color-success: #34c759;
  --color-warning: #ff3b30;

  --font-stack: 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-stack-display: 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --rounded-lg: 18px;
  --rounded-pill: 9999px;
}

/* ---- Page ---- */
.profile-page {
  font-family: var(--font-stack);
  background: var(--color-canvas-parchment);
  min-height: 100vh;
  padding: 40px 20px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ---- Card ---- */
.profile-card {
  background: var(--color-canvas);
  border-radius: var(--rounded-lg);
  width: 100%;
  max-width: 680px;
  padding: var(--spacing-xl);
  box-sizing: border-box;
}

/* ---- Hero Card ---- */
.hero-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding-top: 40px;
  padding-bottom: 40px;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  position: relative;
  width: 88px;
  height: 88px;
}

.avatar-img {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-placeholder {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--color-canvas-parchment);
  color: var(--color-ink-muted-48);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-stack-display);
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.374px;
}

.avatar-edit-btn {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--color-canvas);
  background: var(--color-canvas-parchment);
  color: var(--color-ink-muted-80);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s ease;
}

.avatar-edit-btn:hover {
  background: var(--color-divider-soft);
}

.hero-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-username {
  font-family: var(--font-stack-display);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.14;
  letter-spacing: 0.196px;
  color: var(--color-ink);
  margin: 0;
}

.hero-account {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink-muted-48);
  margin: 0 0 8px 0;
}

/* ---- Status Badge ---- */
.status-badge {
  display: inline-block;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  padding: 4px 12px;
  border-radius: var(--rounded-pill);
  width: fit-content;
}

.status-active {
  background: rgba(52, 199, 89, 0.12);
  color: var(--color-success);
}

.status-frozen {
  background: rgba(255, 59, 48, 0.12);
  color: var(--color-warning);
}

/* ---- Card Title ---- */
.card-title {
  font-family: var(--font-stack-display);
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: var(--color-ink);
  margin: 0 0 20px 0;
}

/* ---- Info List ---- */
.info-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-divider-soft);
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-item:first-child {
  padding-top: 0;
}

.info-label {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink-muted-48);
  flex-shrink: 0;
}

.info-value {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink);
  text-align: right;
}

.info-value-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text-active {
  color: var(--color-success);
}

.text-frozen {
  color: var(--color-warning);
}

/* ---- Text Link ---- */
.text-link {
  font-family: var(--font-stack);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.text-link:hover {
  text-decoration: underline;
}

/* ---- Stats Grid ---- */
.stats-grid {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.stat-value {
  font-family: var(--font-stack-display);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.18;
  letter-spacing: -0.374px;
  color: var(--color-ink);
}

.stat-balance {
  color: var(--color-primary);
}

.stat-label {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-48);
}

.stat-divider {
  width: 1px;
  height: 48px;
  background: var(--color-hairline);
}

/* ---- Action Card ---- */
.action-card {
  padding: 20px var(--spacing-xl);
}

.action-btn {
  font-family: var(--font-stack);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 22px;
  border-radius: var(--rounded-pill);
  border: none;
  cursor: pointer;
  transition:
    transform 0.1s ease,
    background-color 0.15s ease;
  -webkit-font-smoothing: antialiased;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn-primary {
  background: var(--color-primary);
  color: #ffffff;
}

.action-btn-primary:hover {
  background: var(--color-primary-focus);
}

.action-btn-primary:focus-visible {
  outline: 2px solid var(--color-primary-focus);
  outline-offset: 2px;
}

.action-btn-danger {
  background: rgba(255, 59, 48, 0.1);
  color: var(--color-warning);
}

.action-btn-danger:hover {
  background: rgba(255, 59, 48, 0.18);
}

.action-btn-danger:focus-visible {
  outline: 2px solid var(--color-warning);
  outline-offset: 2px;
}

/* ---- Logout Card ---- */
.logout-card {
  padding: 20px var(--spacing-xl);
}

/* ---- Modal Overlay ---- */
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
  background: var(--color-canvas);
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    0 0 0 0.5px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* ---- Modal Header ---- */
.modal-header {
  position: relative;
  padding: 28px 28px 0;
  text-align: center;
}

.modal-title {
  font-family: var(--font-stack-display);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.216px;
  color: var(--color-ink);
  margin: 0 0 6px;
}

.modal-desc {
  font-size: 15px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.24px;
  color: var(--color-ink-muted-48);
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
  background: var(--color-canvas-parchment);
  color: var(--color-ink-muted-48);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s ease, color 0.15s ease;
}

.modal-close:hover {
  background: var(--color-divider-soft);
  color: var(--color-ink);
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
  color: var(--color-ink-muted-80);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.custom-input {
  font-family: var(--font-stack);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: -0.32px;
  color: var(--color-ink);
  width: 100%;
  padding: 12px 44px 12px 16px;
  border-radius: 12px;
  border: 1.5px solid var(--color-hairline);
  background: var(--color-canvas-parchment);
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  -webkit-font-smoothing: antialiased;
}

.custom-input::placeholder {
  color: var(--color-ink-muted-48);
}

.custom-input:focus {
  border-color: var(--color-primary);
  background: var(--color-canvas);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.12);
}

.input-eye {
  position: absolute;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-ink-muted-48);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.15s ease, background 0.15s ease;
}

.input-eye:hover {
  color: var(--color-ink);
  background: rgba(0, 0, 0, 0.04);
}

/* ---- Modal Footer ---- */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 28px;
}

.modal-btn {
  font-family: var(--font-stack);
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
  -webkit-font-smoothing: antialiased;
}

.modal-btn:active {
  transform: scale(0.97);
}

.modal-btn-cancel {
  background: var(--color-canvas-parchment);
  color: var(--color-ink-muted-80);
}

.modal-btn-cancel:hover {
  background: var(--color-divider-soft);
}

.modal-btn-confirm {
  background: var(--color-primary);
  color: #ffffff;
}

.modal-btn-confirm:hover {
  background: var(--color-primary-focus);
}

.modal-btn-confirm:focus-visible {
  outline: 2px solid var(--color-primary-focus);
  outline-offset: 2px;
}

.modal-btn-danger {
  background: var(--color-warning);
  color: #ffffff;
}

.modal-btn-danger:hover {
  background: #d6281f;
}

.modal-btn-danger:focus-visible {
  outline: 2px solid var(--color-warning);
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

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .profile-page {
    padding: 20px 12px 60px;
    gap: 16px;
  }

  .profile-card {
    padding: 24px 20px;
  }

  .hero-card {
    flex-direction: column;
    text-align: center;
    padding-top: 32px;
    padding-bottom: 32px;
  }

  .hero-info {
    align-items: center;
  }

  .stats-grid {
    flex-direction: column;
    gap: 20px;
  }

  .stat-divider {
    width: 80%;
    height: 1px;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 0;
  }

  .info-value {
    text-align: left;
  }

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
