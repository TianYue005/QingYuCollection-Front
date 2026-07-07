import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home/campus-market',
    },
    {
      path: '/user/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'), //这种写法可以避免路由懒加载时的性能问题
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView, //这个页面默认显示
      children: [
        {
          path: 'campus-market',
          name: 'campus-market',
          component: () => import('@/views/CampusMarketView.vue'),
        },
      ],
    },
    {
      path: '/item/:id',
      name: 'item',
      component: () => import('@/views/ItemView.vue'),
    },
    {
      path: '/post-something-unusedused',
      name: 'post-something-unusedused',
      component: () => import('@/views/PostSomethingUnused.vue'),
    },
    {
      path: '/user/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      //当用户输入其他路径时，重定向到/home/campus-market
      path: '/:pathMatch(.*)*',
      redirect: '/home/campus-market',
    },
  ],
})

export default router
