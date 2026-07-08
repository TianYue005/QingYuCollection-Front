<template>
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
</style>
