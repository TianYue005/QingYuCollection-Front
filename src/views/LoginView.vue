<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/api/user'

const router = useRouter()

const account = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')
const errorVisible = ref(false)

onMounted(() => {
  const savedAccount = localStorage.getItem('rememberedAccount')
  if (savedAccount) {
    account.value = savedAccount
    rememberMe.value = true
  }
})

function showError(msg: string) {
  errorMsg.value = msg
  errorVisible.value = true
}

const handleLogin = async () => {
  errorVisible.value = false
  if (!account.value || !password.value) return
  isLoading.value = true
  try {
    const result = await login({ account: account.value, password: password.value })
    if (result.code !== 1) {
      showError(result.msg || '登录失败，请检查账号和密码')
      return
    }
    // data 格式为 "token,用户名"
    const [token, username] = (result.data || '').split(',')
    const storage = rememberMe.value ? localStorage : sessionStorage
    storage.setItem('token', token as string)
    if (username) {
      storage.setItem('username', username as string)
    }

    if (rememberMe.value) {
      localStorage.setItem('rememberedAccount', account.value)
    } else {
      localStorage.removeItem('rememberedAccount')
    }
    router.push('/')
  } catch {
    showError('登录失败，请检查账号和密码')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 顶部导航栏 (global-nav 风格) -->
    <nav class="login-nav">
      <router-link to="/user/login" class="login-nav__logo">
        <svg
          class="login-nav__icon"
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
        <span class="login-nav__title">青隅集 一站式校园服务</span>
      </router-link>
    </nav>

    <!-- 登录卡片 -->
    <main class="login-main">
      <div class="login-card">
        <!-- 标题区 -->
        <div class="login-card__header">
          <h1 class="login-card__title">登录</h1>
          <p class="login-card__subtitle">欢迎回到青隅集</p>
        </div>

        <!-- 表单 -->
        <form class="login-form" @submit.prevent="handleLogin">
          <div class="login-form__field">
            <label for="account" class="login-form__label">邮箱/手机号</label>
            <div class="login-form__input-wrap">
              <svg
                class="login-form__input-icon"
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
                class="login-form__input"
                placeholder="请输入邮箱或手机号"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="login-form__field">
            <label for="password" class="login-form__label">密码</label>
            <div class="login-form__input-wrap">
              <svg
                class="login-form__input-icon"
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
                class="login-form__input"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
            </div>
          </div>

          <!-- 记住我 -->
          <label class="login-form__remember">
            <input v-model="rememberMe" type="checkbox" class="login-form__checkbox" />
            <span class="login-form__checkbox-label">记住我</span>
          </label>

          <button type="submit" class="login-form__submit" :disabled="isLoading">
            <span v-if="!isLoading">登 录</span>
            <span v-else class="login-form__spinner" />
          </button>
        </form>

        <!-- 错误提示对话框 -->
        <el-dialog
          v-model="errorVisible"
          title="登录失败"
          width="360px"
          :close-on-click-modal="true"
        >
          <p class="error-dialog__msg">{{ errorMsg }}</p>
          <template #footer>
            <button class="error-dialog__btn" @click="errorVisible = false">确 定</button>
          </template>
        </el-dialog>

        <!-- 底部链接 -->
        <div class="login-card__footer">
          <a href="#" class="login-card__link">忘记密码？</a>
          <span class="login-card__divider" />
          <router-link :to="{ name: 'register' }" class="login-card__link">创建新账户</router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ===== 页面容器 ===== */
.login-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-canvas-parchment);
}

/* ===== 顶部导航 (global-nav 风格) ===== */
.login-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  background-color: var(--color-surface-black);
  color: var(--color-on-dark);
  flex-shrink: 0;
}

.login-nav__logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-on-dark);
  text-decoration: none;
}

.login-nav__icon {
  width: 18px;
  height: 18px;
  color: var(--color-body-muted);
}

.login-nav__title {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: -0.12px;
  line-height: 1;
}

/* ===== 主体居中布局 ===== */
.login-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}

/* ===== 登录卡片 ===== */
.login-card {
  width: 100%;
  max-width: 412px;
  background-color: var(--color-canvas);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-xxl) var(--spacing-xl);
  /* 仅卡片与背景之间使用微妙的 hairline 边框 */
  border: 1px solid var(--color-hairline);
}

/* ---- 卡片标题 ---- */
.login-card__header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.login-card__title {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0;
  color: var(--color-ink);
  margin-bottom: var(--spacing-xs);
}

.login-card__subtitle {
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink-muted-48);
}

/* ===== 表单 ===== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* ---- 表单字段 ---- */
.login-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xxs);
}

.login-form__label {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-80);
  padding-left: 4px;
}

/* ---- 输入框 (search-input / pill 风格) ---- */
.login-form__input-wrap {
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

.login-form__input-wrap:focus-within {
  border-color: var(--color-primary);
}

.login-form__input-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-ink-muted-48);
}

.login-form__input {
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

.login-form__input::placeholder {
  color: var(--color-ink-muted-48);
}

/* ---- 记住我 ---- */
.login-form__remember {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.login-form__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
  margin: 0;
}

.login-form__checkbox-label {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  color: var(--color-ink-muted-80);
}

/* ---- 登录按钮 (button-primary 风格) ---- */
.login-form__submit {
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
  /* 无阴影 — Apple UI chrome 不使用阴影 */
}

.login-form__submit:hover {
  background-color: var(--color-primary-focus);
}

.login-form__submit:active {
  transform: scale(0.95);
}

.login-form__submit:disabled {
  opacity: 0.7;
  cursor: default;
  transform: none;
}

/* ---- 加载 spinner ---- */

/* ---- 错误提示 ---- */
.login-form__error {
  margin-top: var(--spacing-xs);
  font-size: 14px;
  color: var(--color-error);
}
.login-form__spinner {
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
.login-card__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.login-card__link {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: var(--color-primary);
  text-decoration: none;
}

.login-card__link:hover {
  text-decoration: underline;
}

.login-card__divider {
  width: 1px;
  height: 14px;
  background-color: var(--color-hairline);
}

/* ===== 底部法律信息 (fine-print 风格) ===== */
.login-page__legal {
  margin-top: var(--spacing-xl);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.12px;
  color: var(--color-ink-muted-48);
  text-align: center;
}

/* ===== 错误对话框 ===== */
.error-dialog__msg {
  margin: 0;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.47;
  color: var(--color-ink);
}

.error-dialog__btn {
  padding: 8px 32px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.47;
  color: var(--color-on-primary);
  background: var(--color-primary);
  border: none;
  border-radius: var(--rounded-pill);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.error-dialog__btn:hover {
  background: var(--color-primary-focus);
}

.error-dialog__btn:active {
  transform: scale(0.95);
}
</style>
