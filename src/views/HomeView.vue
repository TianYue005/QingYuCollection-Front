<template>
  <NavBanner>
    <template #nav>
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
    </template>
  </NavBanner>
  <router-view />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import NavBanner from '@/components/NavBanner.vue'

const route = useRoute()

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}
</script>

<style scoped>
.nav-links {
  display: flex;
  gap: 32px;
  align-items: center;
  margin-left: 24px;
}

.nav-link {
  position: relative;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: #1d1d1f;
  letter-spacing: -0.12px;
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
  bottom: 0;
  width: 100%;
  height: 2px;
  border-radius: 1px;
  background: #0066cc;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-link:hover {
  color: #0066cc;
}

.nav-link.active {
  color: #0066cc;
}

.nav-link.active::after {
  transform: scaleX(1);
}
</style>
