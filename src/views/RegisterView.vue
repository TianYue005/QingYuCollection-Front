<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/user'

const router = useRouter()

const username = ref('')
const account = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMsg = ref('')
const showSuccessDialog = ref(false)

const handleRegister = async () => {
  errorMsg.value = ''

  if (!username.value || !account.value || !password.value || !confirmPassword.value) return

  if (password.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }

  isLoading.value = true
  try {
    const result = await register({
      username: username.value,
      account: account.value,
      password: password.value,
    })
    if (result.code !== 1) {
      errorMsg.value = result.msg || '注册失败，请稍后重试'
      return
    }
    showSuccessDialog.value = true
  } catch (err: any) {
    console.error('[Register] 请求失败:', err)
    const msg = err?.response?.data?.msg || err?.response?.data?.message
    errorMsg.value = msg || '注册失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

const handleDialogConfirm = () => {
  showSuccessDialog.value = false
  router.push('/user/login')
}
</script>

<template>
  <div class="register-page">
    <!-- 顶部导航栏 (global-nav 风格) -->
    <nav class="register-nav">
      <router-link to="/user/login" class="register-nav__logo">
        <svg
          class="register-nav__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span class="register-nav__title">青寓集 一站式校园服务</span>
      </router-link>
    </nav>

    <!-- 注册卡片 -->
    <main class="register-main">
      <div class="register-card">
        <!-- 标题区 -->
        <div class="register-card__header">
          <h1 class="register-card__title">注册</h1>
          <p class="register-card__subtitle">创建你的青寓集账户</p>
        </div>

        <!-- 表单 -->
        <form class="register-form" @submit.prevent="handleRegister">
          <div class="register-form__field">
            <label for="account" class="register-form__label">邮箱/手机号</label>
            <div class="register-form__input-wrap">
              <svg
                class="register-form__input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path
                  d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="account"
                v-model="account"
                type="text"
                class="register-form__input"
                placeholder="请输入邮箱或手机号"
                autocomplete="email"
              />
            </div>
          </div>

          <div class="register-form__field">
            <label for="username" class="register-form__label">用户名</label>
            <div class="register-form__input-wrap">
              <svg
                class="register-form__input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="username"
                v-model="username"
                type="text"
                class="register-form__input"
                placeholder="请输入用户名"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="register-form__field">
            <label for="password" class="register-form__label">密码</label>
            <div class="register-form__input-wrap">
              <svg
                class="register-form__input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="password"
                v-model="password"
                type="password"
                class="register-form__input"
                placeholder="请输入密码"
                autocomplete="new-password"
              />
            </div>
          </div>

          <div class="register-form__field">
            <label for="confirmPassword" class="register-form__label">确认密码</label>
            <div class="register-form__input-wrap">
              <svg
                class="register-form__input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                class="register-form__input"
                placeholder="请再次输入密码"
                autocomplete="new-password"
              />
            </div>
          </div>

          <!-- 错误提示 -->
          <p v-if="errorMsg" class="register-form__error">{{ errorMsg }}</p>

          <button type="submit" class="register-form__submit" :disabled="isLoading">
            <span v-if="!isLoading">注 册</span>
            <span v-else class="register-form__spinner" />
          </button>
        </form>

        <!-- 底部链接 -->
        <div class="register-card__footer">
          <span class="register-card__hint">已有账户？</span>
          <router-link to="/user/login" class="register-card__link">立即登录</router-link>
        </div>
      </div>
    </main>

    <!-- 注册成功弹窗 -->
    <Teleport to="body">
      <Transition name="dialog">
        <div v-if="showSuccessDialog" class="dialog-overlay" @click.self="handleDialogConfirm">
          <div class="dialog-card">
            <div class="dialog-icon">
              <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="26" cy="26" r="26" fill="#34C759" />
                <path
                  d="M14 27l7 7 17-17"
                  stroke="#fff"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <h2 class="dialog-title">注册成功</h2>
            <p class="dialog-desc">欢迎加入青寓集，即将跳转至登录页</p>
            <button class="dialog-btn" @click="handleDialogConfirm">前往登录</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===== 页面容器 ===== */
.register-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-canvas-parchment);
}

/* ===== 顶部导航 (global-nav 风格) ===== */
.register-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  background-color: var(--color-surface-black);
  color: var(--color-on-dark);
  flex-shrink: 0;
}

.register-nav__logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-on-dark);
  text-decoration: none;
}

.register-nav__icon {
  width: 18px;
  height: 18px;
  color: var(--color-body-muted);
}

.register-nav__title {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: -0.12px;
  line-height: 1;
}

/* ===== 主体居中布局 ===== */
.register-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}

/* ===== 注册卡片 ===== */
.register-card {
  width: 100%;
  max-width: 412px;
  background-color: var(--color-canvas);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-xxl) var(--spacing-xl);
  border: 1px solid var(--color-hairline);
}

/* ---- 卡片标题 ---- */
.register-card__header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.register-card__title {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0;
  color: var(--color-ink);
  margin-bottom: var(--spacing-xs);
}

.register-card__subtitle {
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink-muted-48);
}

/* ===== 表单 ===== */
.register-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* ---- 表单字段 ---- */
.register-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}

.register-form__label {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-80);
  padding-left: 4px;
}

/* ---- 输入框 (search-input / pill 风格) ---- */
.register-form__input-wrap {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  height: 44px;
  padding: 0 16px;
  background-color: var(--color-canvas);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--rounded-pill);
  transition: border-color 0.15s ease;
}

.register-form__input-wrap:focus-within {
  border-color: var(--color-primary);
}

.register-form__input-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-ink-muted-48);
}

.register-form__input {
  flex: 1;
  height: 100%;
  background: transparent;
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink);
  border: none;
  outline: none;
}

.register-form__input::placeholder {
  color: var(--color-ink-muted-48);
}

/* ---- 错误提示 ---- */
.register-form__error {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.43;
  color: #ff3b30;
  text-align: center;
  margin: 0;
}

/* ---- 注册按钮 (button-primary 风格) ---- */
.register-form__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  margin-top: var(--spacing-sm);
  padding: 11px 22px;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  border: none;
  border-radius: var(--rounded-pill);
  cursor: pointer;
  transition: transform 0.12s ease;
}

.register-form__submit:hover {
  background-color: var(--color-primary-focus);
}

.register-form__submit:active {
  transform: scale(0.95);
}

.register-form__submit:disabled {
  opacity: 0.7;
  cursor: default;
  transform: none;
}

/* ---- 加载 spinner ---- */
.register-form__spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--color-on-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== 卡片底部链接 ===== */
.register-card__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-lg);
}

.register-card__hint {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-48);
}

.register-card__link {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: var(--color-primary);
  text-decoration: none;
}

.register-card__link:hover {
  text-decoration: underline;
}

/* ===== 底部法律信息 (fine-print 风格) ===== */
.register-page__legal {
  margin-top: var(--spacing-xl);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.12px;
  color: var(--color-ink-muted-48);
  text-align: center;
}

/* ===== 成功弹窗 ===== */
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
  width: 300px;
  background: #fff;
  border-radius: 20px;
  padding: 36px 28px 28px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.dialog-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
}

.dialog-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0 0 8px;
}

.dialog-desc {
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--color-ink-muted-48);
  margin: 0 0 24px;
}

.dialog-btn {
  width: 100%;
  height: 44px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  border: none;
  border-radius: var(--rounded-pill);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    transform 0.12s ease;
}

.dialog-btn:hover {
  background: var(--color-primary-focus);
}

.dialog-btn:active {
  transform: scale(0.96);
}

/* ---- 弹窗过渡动画 ---- */
.dialog-enter-active {
  transition: opacity 0.3s ease;
}
.dialog-enter-active .dialog-card {
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.3s ease;
}

.dialog-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-leave-active .dialog-card {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
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
</style>
