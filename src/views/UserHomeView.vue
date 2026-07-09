<template>
  <!-- 横幅 -->
  <NavBanner />
  <div>
    <!-- 下半部分 -->
    <div class="content">
      <!-- 左半部分 -->
      <div class="content-left">
        <el-menu
          default-active="1-1"
          class="el-menu-vertical-demo"
          :collapse="true"
          @open="handleOpen"
          @close="handleClose"
        >
          <el-sub-menu index="1" @click="UserHomeClick">
            <template #title>
              <el-icon><House /></el-icon>
            </template>
            <el-menu-item-group>
              <template #title><span>我的主页</span></template>
            </el-menu-item-group>
          </el-sub-menu>
          <!-- 分割------------------------------------------------------------ -->
          <el-sub-menu index="2" @click="">
            <template #title>
              <el-icon><Goods /></el-icon>
            </template>
            <el-menu-item-group>
              <template #title><span>我的交易</span></template>
              <el-menu-item index="2-1">我发布的</el-menu-item>
              <el-menu-item index="2-2">我卖出的</el-menu-item>
              <el-menu-item index="2-3">我购买的</el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
          <!-- 分割------------------------------------------------------------ -->
          <el-sub-menu index="3" @click="">
            <template #title>
              <el-icon><Star /></el-icon>
            </template>
            <el-menu-item-group>
              <template #title><span>我的收藏</span></template>
            </el-menu-item-group>
          </el-sub-menu>
          <!-- 分割------------------------------------------------------------ -->
          <el-sub-menu index="4" @click="ProfileClick">
            <template #title>
              <el-icon><Setting /></el-icon>
            </template>
            <el-menu-item-group>
              <template #title><span>账户设置</span></template>
            </el-menu-item-group>
          </el-sub-menu>
        </el-menu>
      </div>
      <!-- 右半部分 -->
      <div class="content-right">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import router from '@/router'
import NavBanner from '@/components/NavBanner.vue'
import { House, Goods, Star, Setting } from '@element-plus/icons-vue'

// 处理菜单展开事件
const handleOpen = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
// 处理菜单收起事件
const handleClose = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

// 处理用户点击事件
const UserHomeClick = () => {
  console.log('用户点击了  我的主页  按钮')
  router.push({ name: 'user-page' })
}
// 处理用户点击事件
const ProfileClick = () => {
  console.log('用户点击了  账户设置  按钮')
  router.push({ name: 'profile' })
}
</script>
<style scoped>
.content {
  display: flex;
  max-width: 1440px;
  margin: 0 auto;
  min-height: calc(100vh - 52px);
  background: #f5f5f7;
}

.content-left {
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e8e8ed;
  padding-top: 16px;
}

.content-right {
  flex: 1;
  padding: 24px 32px;
  background: #f5f5f7;
  overflow-y: auto;
}

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}
</style>
