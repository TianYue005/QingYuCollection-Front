import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
      // video.js 依赖链通过 `global` 包以 CJS 方式拿 window/document，
      // 预打包互操作会复制对象并丢失不可枚举属性（如 ShadowRoot），
      // 这里改为直接解析到导出真实对象的 ESM 垫片
      {
        find: /^global\/window$/,
        replacement: fileURLToPath(new URL('./src/vendor/global-window.ts', import.meta.url)),
      },
      {
        find: /^global\/document$/,
        replacement: fileURLToPath(new URL('./src/vendor/global-document.ts', import.meta.url)),
      },
    ],
  },
  // ffmpeg.wasm: 让 wasm 文件作为静态资源正确输出
  assetsInclude: ['**/*.wasm'],
  // sockjs-client 等 CJS 依赖直接引用 Node 的 global 标识符，
  // 浏览器没有 global，模块求值会抛 ReferenceError 导致路由白屏，这里统一指向 globalThis
  define: {
    global: 'globalThis',
  },
  // ffmpeg.wasm: 避免依赖预打包，使 worker 能正确打包
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/stomp': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
