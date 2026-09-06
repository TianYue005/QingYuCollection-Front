<template>
  <div class="user-page">
    <div class="tab-bar">
      <div v-for="tab in tabs" :key="tab.key" class="tab-item" :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)">
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-underline"></span>
      </div>
    </div>
    <div class="tab-divider"></div>
    <router-view />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'treasure', label: '宝贝' },
  { key: 'rust', label: '评价' },
  { key: 'pending', label: '待处理的交易' }
]

// 由当前路由名驱动 tab 高亮（名称与路由 name 一致）
const activeTab = computed(() => {
  const name = String(route.name ?? '')
  return tabs.some((t) => t.key === name) ? name : 'treasure'
})

const switchTab = (key: string) => {
  console.log(`点击了  ${tabs.find((t) => t.key === key)?.label}  按钮`)
  if (key === 'treasure') {
    router.push({ name: 'treasure' })
  } else if (key === 'rust') {
    router.push({ name: 'rust' })
  } else if (key === 'pending') {
    router.push({ name: 'pending' })
  }
}
</script>
<style scoped>
.user-page {
  max-width: 960px;
}

.tab-bar {
  display: flex;
  gap: 32px;
  margin-bottom: 0;
}

.tab-item {
  position: relative;
  cursor: pointer;
  padding: 10px 0;
  font-size: 15px;
  font-weight: 500;
  color: #86868b;
  transition: color 0.2s ease;
  user-select: none;
}

.tab-item:hover {
  color: #1d1d1f;
}

.tab-item.active {
  color: #1d1d1f;
  font-weight: 600;
}

.tab-underline {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: #0071e3;
  border-radius: 2px;
  transition: width 0.25s ease;
}

.tab-item.active .tab-underline {
  width: 100%;
}

.tab-divider {
  height: 1px;
  background: #d2d2d7;
  margin-bottom: 24px;
}
</style>
