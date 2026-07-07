<template>
  <div class="apple-nav">
    <span class="nav-brand"
      ><img style="height: 24px" src="@/assets/picture/logo.svg" alt=""
    /></span>
    <nav class="nav-links">
      <router-link
        class="nav-link"
        :class="{ active: isActive('/home/campus-market') }"
        to="/home/campus-market"
        >校园市集</router-link
      >
      <router-link class="nav-link" :class="{ active: isActive('/home/tools') }" to="/home/tools"
        >便捷工具</router-link
      >
      <router-link class="nav-link" :class="{ active: isActive('/home/forum') }" to="/home/forum"
        >校园论坛</router-link
      >
    </nav>
    <span class="nav-user" @click="onUserClick">
      <span class="user-avatar">游</span>
      <span class="user-name">游客</span>
    </span>
  </div>
  <router-view />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const { handleUserClick } = useAuth()

function onUserClick() {
  handleUserClick()
}

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}
</script>

<style scoped>
.apple-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  height: 52px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
}

.nav-brand {
  font-size: 17px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: -0.374px;
}

.nav-links {
  display: flex;
  gap: 32px;
  align-items: center;
}

.nav-link {
  position: relative;
  font-size: 15px;
  font-weight: 400;
  color: #555;
  letter-spacing: 0.08em;
  text-decoration: none;
  cursor: pointer;
  padding-bottom: 6px;
  transition:
    color 0.25s ease,
    font-weight 0.25s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #4db8ff, #00c9a7);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-link:hover {
  color: #333;
}

.nav-link.active {
  color: #0098b3;
  font-weight: 600;
}

.nav-link.active::after {
  transform: scaleX(1);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  background: #0066cc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #ffffff;
}

.user-name {
  font-size: 14px;
  font-weight: 400;
  color: #1d1d1f;
  letter-spacing: -0.224px;
}
</style>
