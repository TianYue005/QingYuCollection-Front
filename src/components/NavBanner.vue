<template>
  <div class="nav-banner">
    <div class="banner-inner">
      <div class="banner-brand">
        <img class="banner-logo" :src="logo" alt="青寓集" />
        <span class="banner-name">青寓集</span>
        <slot name="nav" />
      </div>
      <div class="banner-user" @click="onUserClick">
        <span class="user-avatar">{{ displayName.charAt(0) }}</span>
        <span class="user-name">{{ displayName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import logo from '@/assets/picture/logo.svg'
import { useAuth } from '@/composables/useAuth'

const { handleUserClick } = useAuth()

const displayName = computed(() => {
  return localStorage.getItem('username') || sessionStorage.getItem('username') || '游客'
})

function onUserClick() {
  handleUserClick()
}
</script>

<style scoped>
/* ===== Apple 风格统一横幅导航 ===== */
.nav-banner {
  background: #f5f5f7;
  padding: 0 32px;
  backdrop-filter: saturate(180%) blur(20px);
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
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
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
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.banner-user:hover {
  opacity: 0.8;
}

.banner-user:active {
  transform: scale(0.95);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #0066cc;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.user-name {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #1d1d1f;
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .nav-banner {
    padding: 0 17px;
  }
}
</style>
