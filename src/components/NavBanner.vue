<template>
  <header class="nav-banner">
    <div class="banner-inner">
      <div class="banner-brand">
        <img class="banner-logo" :src="logo" alt="青寓集" width="32" height="32" />
        <span class="banner-name">青寓集</span>
        <nav class="nav-links">
          <router-link 
            class="nav-link" 
            :class="{ active: isActive('/home/campusMarket') }" 
            to="/home/campusMarket"
          >
            校园市集
          </router-link>
          <router-link 
            class="nav-link" 
            :class="{ active: isActive('/home/tools') }" 
            to="/home/tools"
          >
            便捷工具
          </router-link>
          <router-link 
            class="nav-link" 
            :class="{ active: isActive('/home/forum') }" 
            to="/home/forum"
          >
            校园论坛
          </router-link>
        </nav>
      </div>
      <div class="banner-user" @click="onUserClick">
        <img class="user-avatar" :src="avatarSrc" alt="用户头像" />
        <span class="user-name">{{ displayName }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import logo from '@/assets/picture/logo.svg'
import { isLoggedIn, getUsername, getAccount } from '@/composables/useAuth'
import { accountInfo, type UserAccountInfo } from '@/api/user'
import { resolveAvatar } from '@/utils/avatar'

const router = useRouter()
const route = useRoute()

// 响应式存储用户信息（驱动模板自动刷新）
const storedUserInfo = ref<UserAccountInfo | null>(null)

// 展示用户名（优先取接口返回的 userName，兼容历史存储的 username）
const displayName = computed(() => storedUserInfo.value?.userName || getUsername() || '')

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

// 展示头像（空值或后端占位值"默认头像"时，统一显示默认头像图片）
const avatarSrc = computed(() => resolveAvatar(storedUserInfo.value?.avatar))

const onUserClick = () => {
  if (!isLoggedIn()) {
    router.push({ name: 'login' })
    return
  }
  router.push({ name: 'my' })
}

// 组件加载时自动获取账号基本信息，并保存到临时存储（与 Token 同源：localStorage / sessionStorage）
onMounted(async () => {
  // 先从缓存恢复，保证首次渲染就有数据
  const cached = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
  if (cached) {
    try { storedUserInfo.value = JSON.parse(cached) } catch {}
  }

  if (!isLoggedIn()) return
  const acc = getAccount()
  if (!acc) return
  try {
    const res = await accountInfo(acc)
    if (res.code === 1 && res.data) {
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage
      storage.setItem('userInfo', JSON.stringify(res.data))
      // 更新响应式引用，驱动模板自动刷新
      storedUserInfo.value = res.data
    }
  } catch (e) {
    console.error('获取账号信息失败：', e)
  }
})
</script>

<style scoped>
/* ===== Apple 风格统一横幅导航 ===== */
.nav-banner {
  background: rgba(245, 245, 247, 0.92);
  backdrop-filter: blur(20px);
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.banner-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.banner-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.banner-name {
  font-family: 'SF Pro Display', system-ui, -apple-system, sans-serif;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: #1d1d1f;
}

.banner-user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;
}

.banner-user:hover {
  opacity: 0.8;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.user-name {
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #1d1d1f;
}

.nav-links {
  display: flex;
  gap: 32px;
  align-items: center;
  margin-left: 24px;
}

.nav-link {
  position: relative;
  font-family: 'SF Pro Text', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: #1d1d1f;
  letter-spacing: -0.12px;
  text-decoration: none;
  cursor: pointer;
  padding-bottom: 6px;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  border-radius: 1px;
  background: #0066cc;
  opacity: 0;
}

.nav-link:hover,
.nav-link.active {
  color: #0066cc;
}

.nav-link.active::after {
  opacity: 1;
}

@media (max-width: 640px) {
  .nav-banner {
    padding: 0 17px;
  }
}
</style>