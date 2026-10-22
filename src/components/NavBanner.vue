<template>
  <header class="nav-banner">
    <div class="banner-inner">
      <div class="banner-brand">
        <img class="banner-logo" :src="logo" alt="青寓集" width="32" height="32" />
        <span class="banner-name">青寓集</span>
        <nav ref="navRef" class="nav-links">
          <router-link 
            class="nav-link" 
            :class="{ active: isActive('/home/campusMarket') }" 
            to="/home/campusMarket"
          >
            校园市集
          </router-link>
          <router-link 
            class="nav-link" 
            :class="{ active: isActive('/home/points') }" 
            to="/home/points"
          >
            积分中心
          </router-link>
          <router-link 
            class="nav-link" 
            :class="{ active: isActive('/home/forum') }" 
            to="/home/forum"
          >
            校园论坛
          </router-link>
          <span
            v-show="activeNavIndex >= 0"
            class="nav-indicator"
            :class="{ 'is-ready': indicatorReady }"
            :style="indicatorStyle"
          ></span>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import logo from '@/assets/picture/logo.png'
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

// ===== 导航滑动下划线 =====
const navRef = ref<HTMLElement | null>(null)
const navPaths = ['/home/campusMarket', '/home/points', '/home/forum']
const activeNavIndex = computed(() => navPaths.findIndex((path) => route.path.startsWith(path)))
const indicatorStyle = ref({ width: '0px', transform: 'translateX(0px)' })
const indicatorReady = ref(false)

/** 根据当前激活的导航项测量下划线位置与宽度 */
function updateNavIndicator() {
  const nav = navRef.value
  if (!nav) return
  const links = nav.querySelectorAll<HTMLElement>('.nav-link')
  const el = links[activeNavIndex.value]
  if (!el) return
  indicatorStyle.value = {
    width: `${el.offsetWidth}px`,
    transform: `translateX(${el.offsetLeft}px)`,
  }
}

function handleResize() {
  updateNavIndicator()
}

watch(
  () => route.path,
  () => nextTick(updateNavIndicator),
)

// 首帧先定位条纹，再开启过渡，避免初始加载时出现滑动
onMounted(() => {
  nextTick(() => {
    updateNavIndicator()
    nextTick(() => {
      indicatorReady.value = true
    })
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

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
  /* 毛玻璃效果：半透明底色 + 背景模糊 */
  background: rgba(245, 245, 247, 0.72);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
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
  position: relative;
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
  transition: color 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  color: #0066cc;
}

/* 滑动下划线：切换导航时在按钮下方平滑移动 */
.nav-indicator {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  border-radius: 2px;
  background: #0066cc;
  pointer-events: none;
  will-change: transform;
}

/* 滑动下划线：切换导航时在按钮下方平滑移动。
   只过渡 transform，保证它是合成器动画：
   路由切换时主线程忙着挂载新页面，width/left 这类主线程动画会被拖慢 */
.nav-indicator.is-ready {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 640px) {
  .nav-banner {
    padding: 0 17px;
  }
}
</style>