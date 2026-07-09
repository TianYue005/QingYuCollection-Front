<template>
  <!-- 没有选择任何对话时显示 -->
  <div v-show="display" class="message-placeholder">
    <div class="placeholder-content">
      <!-- Logo -->
      <div class="logo-wrapper">
        <img src="@/assets/picture/logo.svg" alt="" />
      </div>
      <h1 class="placeholder-title">未选择任何联系人</h1>
      <p class="placeholder-subtitle">点击左侧列表开聊吧</p>
    </div>
  </div>
  <!-- 当上面隐藏的时候显示 -->
  <div v-show="!display" class="message-container">
    <!-- 聊天内容区域 -->
    <div class="message-content">
      <!-- 滚动条 -->
      <div class="scrollbar-container">
        <div class="scrollbar"></div>
      </div>
    </div>
    <!-- 输入框区域 -->
    <div class="input-container">
      <input type="text" placeholder="请输入消息" />
      <button>发送</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { watch } from 'vue'
const display = ref(true)

import { useRoute } from 'vue-router'

const route = useRoute()
// 监听路由参数变化 及时更新display值
watch(
  () => route.params.chatId,
  (newVal) => {
    if (newVal) {
      display.value = true
    } else {
      display.value = false
    }
  },
)
</script>
<style scoped>
.message-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f5f5f7;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 17px;
}

.logo-wrapper {
  margin-bottom: 7px;
}

.logo-wrapper img {
  width: 64px;
  height: 64px;
  display: block;
}

.placeholder-title {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.14;
  letter-spacing: 0.196px;
  color: #1d1d1f;
  margin: 0;
}

.placeholder-subtitle {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #7a7a7a;
  margin: 0;
}

/* ========== 聊天容器 ========== */
.message-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #f5f5f7;
}

/* ========== 消息内容区域 ========== */
.message-content {
  flex: 1;
  display: flex;
  overflow-y: auto;
  padding: 20px 24px;
  scroll-behavior: smooth;
}

.message-content::-webkit-scrollbar {
  width: 6px;
}

.message-content::-webkit-scrollbar-track {
  background: transparent;
}

.message-content::-webkit-scrollbar-thumb {
  background: #c1c1c6;
  border-radius: 3px;
}

.message-content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a6;
}

/* ========== 自定义滚动条容器（备选方案） ========== */
.scrollbar-container {
  display: none;
}

/* ========== 输入框区域 ========== */
.input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background-color: #ffffff;
  border-top: 1px solid #e5e5ea;
}

.input-container input {
  flex: 1;
  height: 40px;
  padding: 0 16px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  color: #1d1d1f;
  background-color: #f5f5f7;
  border: 1px solid #e5e5ea;
  border-radius: 20px;
  outline: none;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.input-container input::placeholder {
  color: #8e8e93;
}

.input-container input:focus {
  background-color: #ffffff;
  border-color: #007aff;
}

.input-container button {
  height: 40px;
  padding: 0 24px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #ffffff;
  background-color: #007aff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.1s;
}

.input-container button:hover {
  background-color: #0062cc;
}

.input-container button:active {
  transform: scale(0.97);
}
</style>
