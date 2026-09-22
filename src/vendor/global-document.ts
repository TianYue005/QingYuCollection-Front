// global/document 的 ESM 垫片：直接导出真实 document 对象。
// 与 global-window.ts 同理，避免预打包互操作破坏引用完整性。
export default document
