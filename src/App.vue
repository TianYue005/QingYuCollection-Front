<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import FloatingButtons from '@/components/FloatingButtons.vue'

const route = useRoute()

// 登录、注册页不显示悬浮按钮
const hiddenRouteNames = ['login', 'register']
const showFloatingButtons = computed(() => !hiddenRouteNames.includes(route.name as string))
</script>

<template>
  <router-view />
  <FloatingButtons v-if="showFloatingButtons" />
</template>
