<template>
  <!-- 横幅 -->
  <NavBanner />
  <div>
    <!-- 下半部分 -->
    <div class="content">
      <!-- 左半部分 -->
      <div class="content-left">
        <el-menu :default-active="activeIndex" class="el-menu-vertical-demo" :collapse="true" :show-timeout="0"
          :hide-timeout="800" popper-class="my-side-menu-popper" @open="handleOpen" @close="handleClose">
          <el-menu-item index="1" @click="UserHomeClick">
            <el-icon>
              <House />
            </el-icon>
            <template #title>我的主页</template>
          </el-menu-item>
          <!-- 分割------------------------------------------------------------ -->
          <el-sub-menu index="2">
            <template #title>
              <el-icon>
                <Goods />
              </el-icon>
            </template>
            <el-menu-item-group>
              <template #title><span>我的交易</span></template>
              <el-menu-item index="2-2" @click="MySale">我卖出的</el-menu-item>
              <el-menu-item index="2-3" @click="MyBuy">我购买的</el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
          <!-- 分割------------------------------------------------------------ -->
          <el-menu-item index="3" @click="FavoriteClick">
            <el-icon>
              <Star />
            </el-icon>
            <template #title>我的收藏</template>
          </el-menu-item>
          <!-- 分割------------------------------------------------------------ -->
          <el-menu-item index="4" @click="ProfileClick">
            <el-icon>
              <Setting />
            </el-icon>
            <template #title>账户设置</template>
          </el-menu-item>
          <!-- 分割------------------------------------------------------------ -->
          <el-sub-menu index="5">
            <template #title>
              <el-icon>
                <UserFilled />
              </el-icon>
            </template>
            <el-menu-item-group>
              <template #title><span>组团相关</span></template>
              <el-menu-item index="5-1" @click="TeamUpJoin">我的参与</el-menu-item>
              <el-menu-item index="5-2" @click="TeamUpCreate">我的创建</el-menu-item>
            </el-menu-item-group>
          </el-sub-menu>
          <!-- 分割------------------------------------------------------------ -->
          <el-sub-menu index="6">
            <template #title>
              <el-icon>
                <Connection />
              </el-icon>
            </template>
            <el-menu-item-group>
              <template #title><span>圈子相关</span></template>
              <el-menu-item index="6-1" @click="MyClrcle">我的参与</el-menu-item>
              <el-menu-item index="6-2" @click="MyCircleCreate">我的创建</el-menu-item>
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
import { House, Goods, Star, Setting, UserFilled, Connection } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 菜单高亮跟随当前路由：el-sub-menu 自己不会高亮（它的高亮由内部的 el-menu-item 推导出来），
// 所以带子项的入口用子项 index，叶子入口用自己的 index
const activeIndex = computed(() => {
  switch (route.name) {
    case 'mysSale':
      return '2-2'
    case 'mysBuy':
      return '2-3'
    case 'myTeamUpJoin':
      return '5-1'
    case 'myTeamUpCreate':
      return '5-2'
    case 'myCircleJoin':
      return '6-1'
    case 'myCircleCreate':
      return '6-2'
    case 'favorite':
      return '3'
    case 'profile':
      return '4'
    case 'treasure':
    case 'rust':
    case 'pending':
      return '1'
    default:
      return ''
  }
})

//我的交易
const MySale = () => {
  router.push({ name: 'mysSale' })
}
//我的购买
const MyBuy = () => {
  router.push({ name: 'mysBuy' })
}
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
  if (route.name === 'treasure') {
    return
  } else if (route.name === 'rust') {
    return
  } else {
    router.push({ name: 'treasure' })
  }
}
// 处理用户点击事件
const ProfileClick = () => {
  console.log('用户点击了  账户设置  按钮')
  router.push({ name: 'profile' })
}
// 处理用户点击事件
const FavoriteClick = () => {
  console.log('用户点击了  我的收藏  按钮')
  router.push({ name: 'favorite' })
}

const TeamUpJoin = () => {
  console.log('用户点击了  我的参与  按钮')
  router.push({ name: 'myTeamUpJoin' })
}
const TeamUpCreate = () => {
  console.log('用户点击了  我的创建  按钮')
  router.push({ name: 'myTeamUpCreate' })
}
const MyClrcle = () => {
  console.log('用户点击了  我的参与  按钮')
  router.push({ name: 'myCircleJoin' })
}
const MyCircleCreate = () => {
  console.log('用户点击了  我的创建  按钮')
  router.push({ name: 'myCircleCreate' })
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

<style>
/* 折叠侧边栏的悬浮提示/子菜单弹层挂在 body 上，非 scoped 才能命中：
   缩短出现动画时长，配合 show-timeout=0 让 hover 弹出更跟手 */
.my-side-menu-popper {
  transition-duration: 0.12s !important;
}
</style>
