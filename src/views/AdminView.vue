<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminLogin } from '@/api/admin'
import { saveTokens } from '@/composables/useAuth'
import { toast } from '@/utils/message'

const router = useRouter()

const account = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)

const handleLogin = async () => {
  if (!account.value || !password.value) {
    toast.warning('请输入管理员账号和密码')
    return
  }
  isLoading.value = true
  try {
    const result = await adminLogin({ account: account.value, password: password.value })
    const tokenVO = result.data
    const shortToken = tokenVO?.shortToken
    if (result.code !== 1 || !shortToken) {
      toast.error(result.msg || tokenVO?.message || '账号或密码错误')
      return
    }
    // 保存长期 + 短期 token，后续 /api/admin 请求由拦截器自动携带短期 token
    saveTokens(shortToken, tokenVO?.longToken || tokenVO?.LongToken || '', true)
    router.push({ name: 'adminManage' })
  } catch {
    toast.error('登录失败，请检查账号和密码')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="admin-login-page">
    <nav class="admin-login-nav">
      <span class="admin-login-nav__logo">
        <svg
          class="admin-login-nav__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2 4 6v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V6l-8-4z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span class="admin-login-nav__title">青寓集 · 管理后台</span>
      </span>
    </nav>

    <main class="admin-login-main">
      <div class="admin-login-card">
        <div class="admin-login-card__header">
          <h1 class="admin-login-card__title">管理员登录</h1>
          <p class="admin-login-card__subtitle">请使用管理员账号登录后台</p>
        </div>

        <form class="admin-login-form" @submit.prevent="handleLogin">
          <div class="admin-login-form__field">
            <label for="admin-account" class="admin-login-form__label">管理员账号</label>
            <div class="admin-login-form__input-wrap">
              <svg
                class="admin-login-form__input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="admin-account"
                v-model="account"
                type="text"
                class="admin-login-form__input"
                placeholder="请输入管理员账号"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="admin-login-form__field">
            <label for="admin-password" class="admin-login-form__label">密码</label>
            <div class="admin-login-form__input-wrap">
              <svg
                class="admin-login-form__input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="admin-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="admin-login-form__input"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="admin-login-form__toggle"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="showPassword"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" class="admin-login-form__submit" :disabled="isLoading">
            {{ isLoading ? '登录中…' : '登 录' }}
          </button>
        </form>

        <div class="admin-login-card__footer">
          <svg
            class="admin-login-card__footer-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>仅限授权管理员访问</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-login-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-canvas-parchment);
}

/* ===== 顶部导航 ===== */
.admin-login-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  background-color: var(--color-surface-black);
  color: var(--color-on-dark);
  flex-shrink: 0;
}

.admin-login-nav__logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.admin-login-nav__icon {
  width: 18px;
  height: 18px;
  color: var(--color-body-muted);
}

.admin-login-nav__title {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: -0.12px;
  line-height: 1;
}

/* ===== 主体 ===== */
.admin-login-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}

.admin-login-card {
  width: 100%;
  max-width: 412px;
  background-color: var(--color-canvas);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-xxl) var(--spacing-xl);
  border: 1px solid var(--color-hairline);
}

/* ---- 卡片头部 ---- */
.admin-login-card__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.admin-login-card__title {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0;
  color: var(--color-ink);
  margin-bottom: var(--spacing-xs);
}

.admin-login-card__subtitle {
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink-muted-48);
}

/* ===== 表单 ===== */
.admin-login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.admin-login-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}

.admin-login-form__label {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-80);
  padding-left: 4px;
}

.admin-login-form__input-wrap {
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

.admin-login-form__input-wrap:hover {
  border-color: rgba(0, 0, 0, 0.18);
}

.admin-login-form__input-wrap:focus-within {
  border-color: var(--color-primary);
}

.admin-login-form__input-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-ink-muted-48);
}

.admin-login-form__input {
  flex: 1;
  min-width: 0;
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

.admin-login-form__input::placeholder {
  color: var(--color-ink-muted-48);
}

/* ---- 显示/隐藏密码 ---- */
.admin-login-form__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  margin-right: -6px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--rounded-full);
  color: var(--color-ink-muted-48);
  cursor: pointer;
  transition: color 0.15s ease;
}

.admin-login-form__toggle svg {
  width: 16px;
  height: 16px;
}

.admin-login-form__toggle:hover {
  color: var(--color-ink);
}

.admin-login-form__toggle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ---- 登录按钮 ---- */
.admin-login-form__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  margin-top: var(--spacing-xxs);
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
  transition:
    background-color 0.15s ease,
    transform 0.12s ease;
}

.admin-login-form__submit:hover {
  background-color: var(--color-primary-focus);
}

.admin-login-form__submit:active {
  transform: scale(0.95);
}

.admin-login-form__submit:disabled {
  opacity: 0.7;
  cursor: default;
  transform: none;
}

.admin-login-form__submit:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ===== 卡片底部 ===== */
.admin-login-card__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-divider-soft);
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: -0.12px;
  color: var(--color-ink-muted-48);
}

.admin-login-card__footer-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .admin-login-main {
    padding: var(--spacing-md);
  }

  .admin-login-card {
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  .admin-login-card__title {
    font-size: 30px;
  }

  .admin-login-card__subtitle {
    font-size: 15px;
  }
}

/* ===== 减少动效 ===== */
@media (prefers-reduced-motion: reduce) {
  .admin-login-form__input-wrap,
  .admin-login-form__toggle,
  .admin-login-form__submit {
    transition: none;
  }

  .admin-login-form__submit:active {
    transform: none;
  }
}
</style>
