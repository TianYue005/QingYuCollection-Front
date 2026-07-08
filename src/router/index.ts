import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      //首页
      path: '/',
      redirect: '/home/campus-market',
    },
    {
      //登录
      path: '/user/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'), //这种写法可以避免路由懒加载时的性能问题
    },
    {
      //首页
      path: '/home',
      name: 'home',
      component: HomeView, //这个页面默认显示
      children: [
        {
          //校园市场
          path: 'campus-market',
          name: 'campus-market',
          component: () => import('@/views/CampusMarketView.vue'),
        },
      ],
    },
    {
      //商品详情
      path: '/item/:id',
      name: 'item',
      component: () => import('@/views/ItemView.vue'),
    },
    {
      //发布商品
      path: '/post-something-unusedused',
      name: 'post-something-unusedused',
      component: () => import('@/views/PostSomethingUnused.vue'),
    },
    {
      //注册
      path: '/user/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      //聊天
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
      children: [
        {
          //聊天详情
          path: 'detail/:chatId',
          name: 'chat-detail',
          component: () => import('@/components/MessageView.vue'),
        },
      ],
    },
    {
      //其他路径
      path: '/:pathMatch(.*)*',
      redirect: '/home/campus-market',
    },
  ],
})

export default router
