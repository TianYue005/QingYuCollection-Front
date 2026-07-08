<template>
  <NavBanner />
  <!-- 聊天主界面 -->
  <div class="chat-container">
    <!-- 左侧联系人列表 -->
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">消息</h2>
      </div>
      <div class="contact-list">
        <div v-for="item in messageSelectList" :key="item.icon" class="contact-item">
          <img class="contact-avatar" :src="item.icon" alt="好友头像" />
          <div class="contact-info">
            <div class="contact-top">
              <span class="contact-name">{{ item.name }}</span>
              <span class="contact-time">{{ item.time }}</span>
            </div>
            <span class="contact-message">{{ item.lastMessage }}</span>
          </div>
        </div>
      </div>
      <!-- 空状态 -->
      <div v-if="messageSelectList.length === 0" class="sidebar-empty">
        <p class="empty-text">暂无消息</p>
      </div>
    </div>
    <!-- 右侧聊天区域 -->
    <div class="chat-main">
      <MessageView />
    </div>
  </div>
</template>

<script setup lang="ts">
import MessageView from '@/components/MessageView.vue'
import NavBanner from '@/components/NavBanner.vue'
import { ref } from 'vue'

// 消息选择
type messageSelect = {
  name: string // 好友名称
  icon: string // 好友头像
  lastMessage: string // 最后一条消息
  time: string // 时间
}
//存储消息选择
const messageSelectList = ref<messageSelect[]>([])
</script>

<style scoped>
/* ===== Apple Design System CSS Variables ===== */
/*
 * 基于 resources/apple/DESIGN.md 的 Apple 设计规范
 * 颜色: ink #1d1d1f, primary #0066cc, canvas #ffffff, parchment #f5f5f7
 * 排版: SF Pro Display (标题) / SF Pro Text (正文)
 * 间距: 4/8/12/17/24/32/48
 * 圆角: none/sm(8)/md(11)/lg(18)/pill(9999)
 * 无装饰阴影 — UI chrome 不使用阴影，仅产品图像可带阴影
 */

/* ===== 聊天主容器 ===== */
.chat-container {
  display: flex;
  height: calc(100vh - 64px);
  max-width: 1440px;
  margin: 0 auto;
  background: #ffffff;
}

/* ===== 左侧联系人列表 ===== */
.chat-sidebar {
  width: 360px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
  background: #fafafc;
}

.sidebar-header {
  padding: 17px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.sidebar-title {
  margin: 0;
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

/* ===== 联系人列表 ===== */
.contact-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #f0f0f0;
}

.contact-item:hover {
  background: #f5f5f7;
}

.contact-item:active {
  transform: scale(0.99);
}

.contact-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0;
}

.contact-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.contact-name {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-time {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.12px;
  color: #7a7a7a;
  white-space: nowrap;
  flex-shrink: 0;
}

.contact-message {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #7a7a7a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 空状态 ===== */
.sidebar-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
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
}

/* ===== 右侧聊天区域 ===== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  min-width: 0;
}

/* ===== 响应式 ===== */
@media (max-width: 834px) {
  .chat-sidebar {
    width: 280px;
    min-width: 260px;
  }

  .contact-item {
    padding: 12px 17px;
  }

  .sidebar-header {
    padding: 17px 17px;
  }
}

@media (max-width: 640px) {
  .banner {
    padding: 0 17px;
  }

  .chat-sidebar {
    width: 100%;
    min-width: unset;
    border-right: none;
  }

  .chat-main {
    display: none;
  }

  .chat-sidebar:has(+ .chat-main) ~ .chat-main {
    display: flex;
  }
}
</style>
