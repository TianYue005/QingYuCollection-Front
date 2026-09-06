<template>
  <NavBanner />

  <Suspense>
    <template #default>
      <router-view />
    </template>
    <template #fallback>
      <div class="skeleton-container" aria-hidden="true">
        <div class="skeleton-header">
          <div class="skeleton-bar skeleton-bar--short"></div>
          <div class="skeleton-bar skeleton-bar--medium"></div>
        </div>
        <div class="skeleton-grid">
          <div 
            class="skeleton-card" 
            v-for="itemKey in SKELETON_COUNT" 
            :key="`sk-${itemKey}`"
          >
            <div class="skeleton-img"></div>
            <div class="skeleton-bar skeleton-bar--full"></div>
            <div class="skeleton-bar skeleton-bar--half"></div>
          </div>
        </div>
      </div>
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import NavBanner from '@/components/NavBanner.vue'

const SKELETON_COUNT = 8

</script>

<style scoped>
/* ===== 高性能骨架屏样式 ===== */
.skeleton-container {
  width: 80%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 48px 0;
}

.skeleton-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
}

/* 统一扫光背景，利用 transform: translateX 替代 background-position 避免重绘 */
.skeleton-bar,
.skeleton-img {
  position: relative;
  overflow: hidden;
  background-color: #e8e8ed;
}

.skeleton-bar::after,
.skeleton-img::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.5s infinite;
}

.skeleton-bar {
  height: 16px;
  border-radius: 8px;
}

.skeleton-bar--short {
  width: 33%;
  max-width: 400px;
  height: 44px;
  border-radius: 22px;
}

.skeleton-bar--medium {
  width: 24%;
  max-width: 280px;
  height: 16px;
}

.skeleton-bar--full {
  width: 100%;
}

.skeleton-bar--half {
  width: 60%;
}

/* 改用 Grid 布局规避从 column-count 切换页面时的整页重排 */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.skeleton-card {
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  padding-bottom: 17px;
}

.skeleton-img {
  width: 100%;
  height: 200px;
  margin-bottom: 17px;
}

.skeleton-card .skeleton-bar {
  margin: 8px 17px 0;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* 响应式断点适配 Grid */
@media (max-width: 1200px) {
  .skeleton-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .skeleton-grid {
    grid-template-columns: repeat(1, 1fr);
  }
}
</style>