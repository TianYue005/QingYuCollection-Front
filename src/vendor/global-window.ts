// global/window 的 ESM 垫片：直接导出真实 window 对象。
// video.js 依赖链（global 包）通过 CJS 导出 window，Vite 预打包时的 CJS→ESM
// 互操作会复制对象并丢失不可枚举属性（如 ShadowRoot），导致运行时
// `el.getRootNode() instanceof window.ShadowRoot` 抛 TypeError。
// 用垫片保留真实引用，从根上规避该问题。
export default window
