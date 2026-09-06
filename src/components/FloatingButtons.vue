<template>
  <div class="floating-buttons">
    <TransitionGroup name="btn-list" tag="div" class="floating-buttons-inner">
      <div key="post" class="floating-btn" @click="handlePost">
        <img src="@/assets/picture/sell.apng" alt="发闲置" />
        <span>发闲置</span>
      </div>
      <div key="messages" class="floating-btn" @click="handleMessages">
        <svg viewBox="0 0 24 24" class="floating-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>消息</span>
      </div>
      <div key="feedback" class="floating-btn" @click="handleFeedback">
        <svg viewBox="0 0 24 24" class="floating-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>反馈</span>
      </div>
      <div key="service" class="floating-btn" @click="handleCustomerService">
        <svg viewBox="0 0 24 24" class="floating-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path
            d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
        <span>客服</span>
      </div>
      <div key="home" class="floating-btn" @click="handleHome">
        <svg viewBox="0 0 24 24" class="floating-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>主页</span>
      </div>
      <div v-if="showBackTop" key="backTop" class="floating-btn" @click="handleBackToTop">
        <svg viewBox="0 0 24 24" class="floating-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m18 15-6-6-6 6" />
        </svg>
        <span>回顶部</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const showBackTop = ref(false)

const SCROLL_THRESHOLD = 400

function handleScroll() {
  showBackTop.value = window.scrollY > SCROLL_THRESHOLD
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
// 点击发闲置按钮跳转到发闲置页面
function handlePost() {
  router.push({ name: 'postSomethingUnusedused' })
}

function handleMessages() {
  router.push({ name: 'chat' })
}

function handleFeedback() {
  // TODO: 打开反馈表单
  router.push({ name: 'feedback' })
}

function handleCustomerService() {
  // TODO: 打开客服对话
}
// 点击主页按钮跳转到校园市场页面
function handleHome() {
  if (window.location.pathname.startsWith('/home/campusMarket')) {
    router.push({ name: 'campusMarket' })
  } else if (window.location.pathname.startsWith('/home/tools')) {
    router.push({ name: 'tools' })
  } else if (window.location.pathname.startsWith('/home/forum/')) {
    router.push({ name: 'forum' })
  } else {
    router.push({ name: 'campusMarket' })
  }
}
// 点击回顶部按钮滚动到顶部
function handleBackToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.floating-buttons {
  position: fixed;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 999;
}

.floating-buttons-inner {
  display: flex;
  flex-direction: column;
}

.floating-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: box-shadow 0.2s;
  user-select: none;
}

.floating-btn+.floating-btn {
  margin-top: 8px;
}

.floating-btn:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.floating-btn:active {
  transform: scale(0.95);
}

.floating-btn img,
.floating-btn .floating-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  color: #666;
}

.floating-btn span {
  margin-top: 4px;
  font-size: 11px;
  color: #666;
  line-height: 1;
}

/* 按钮列表过渡动画 */
.btn-list-enter-active {
  transition: all 0.3s ease-out;
}

.btn-list-leave-active {
  transition: all 0.25s ease-in;
}

.btn-list-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.8);
}

.btn-list-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.8);
}

.btn-list-move {
  transition: transform 0.3s ease;
}
</style>
