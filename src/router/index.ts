import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import TreasureView from '@/views/TreasureView.vue'
import HandyToolsView from '@/views/HandyToolsView.vue'
import ForumView from '@/views/ForumView.vue'
import CampusMarketView from '@/views/CampusMarketView.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      //首页
      path: '/',
      redirect: { name: 'campusMarket' },
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
      component: HomeView,
      children: [
        {
          //校园市场
          path: 'campusMarket',
          name: 'campusMarket',
          component: CampusMarketView,
        },
        {
          //便捷工具
          path: 'tools',
          name: 'tools',
          component: HandyToolsView,
        },
        {
          //视频工具
          path: 'tools/VideoStitching',
          name: 'VideoStitching',
          component: () => import('@/views/VideoStitchingView.vue'),
        },
        {
          //图片转GIF
          path: 'tools/Picture2GIFView',
          name: 'Picture2GIFView',
          component: () => import('@/views/Picture2GIFView.vue'),
        },
        {
          //MarkDown编辑器
          path: 'tools/MdEditer',
          name: 'MdEditer',
          component: () => import('@/views/MdEditerView.vue'),
        },
        {
          //校园论坛
          path: 'forum',
          name: 'forum',
          component: ForumView,
          redirect: { name: 'teamup' },
          children: [
            {
              path: '',
              name: 'teamup',
              redirect: { name: 'teamup' },
            },
            {
              path: 'TeamUp',
              name: 'teamup',
              component: () => import('@/components/TeamUp.vue'),
            },
            {
              path: 'Circle',
              name: 'circle',
              redirect: { name: 'Dynamic' },
              component: () => import('@/components/Circle.vue'),
              children: [
                {
                  path: 'Events',
                  name: 'Events',
                  component: () => import('@/components/Events.vue')
                },
                {
                  path: 'Dynamic',
                  name: 'Dynamic',
                  component: () => import('@/components/Dynamic.vue')
                }
              ]
            },
          ]
        },
        {
          //组团详情
          path: 'forum/TeamUp/TeamUpScan/:id',
          name: 'TeamUpScan',
          component: () => import('@/components/TeamUpScan.vue')
        },
        {
          //圈子详情（动态/任务/活动由 option 区分：Dynamic / Task / Activity）
          path: 'forum/Circle/CircleUpdatesScan/:option/:id',
          name: 'CircleUpdatesScan',
          component: () => import('@/components/CircleUpdatesScan.vue')
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
      path: '/postSomethingUnusedused',
      name: 'postSomethingUnusedused',
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
          //聊天首页：无会话时右侧显示 MessageView 的"未选择任何联系人"占位
          path: '',
          name: 'chatIndex',
          redirect: { name: 'chatDetail' },
        },
        {
          //聊天详情
          path: 'detail/:chatId?',
          name: 'chatDetail',
          component: () => import('@/components/MessageView.vue'),
        },
      ],
    },
    {
      //用户的"我的" 点击用户头像或名字进行跳转
      path: '/my',
      name: 'my',
      redirect: { name: 'treasure' },
      component: () => import('@/views/UserHomeView.vue'),
      children: [
        {
          path: 'page',
          name: 'page',
          component: () => import('@/components/UserPage.vue'),
          children: [
            {
              path: '',
              name: 'pageIndex',
              redirect: { name: 'treasure' }
            },
            {
              path: 'treasure',
              name: 'treasure',//宝贝界面
              component: TreasureView
            },
            {
              path: 'rust',
              name: 'rust',//信用及评价
              component: () => import('@/views/CreditAndReviewsView.vue')
            },
            {
              path:'pending',
              name:'pending',
              component:() => import('@/views/PendingView.vue')
            }
          ]
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/components/Profile.vue'),
        },
        {
          path: 'favorite',
          name: 'favorite',
          component: () => import('@/views/FavoriteView.vue'),
        },
        {
          path: 'mysSale',
          name: 'mysSale',
          component: () => import('@/views/MySaleView.vue'),
        },
        {
          path: 'mysBuy',
          name: 'mysBuy',
          component: () => import('@/views/MyBuyView.vue'),
        }
      ],
    },
    {
      //反馈
      path: '/feedback',
      name: 'feedback',
      component: () => import('@/views/FeedbackView.vue'),
    },
    {
      //其他路径
      path: '/:pathMatch(.*)*',
      redirect: '/home/campus-market',
    },
  ],
})

export default router
