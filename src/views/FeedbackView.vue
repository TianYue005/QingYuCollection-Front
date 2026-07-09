<template>
  <div class="feedback-page">
    <div class="page-container">
      <!-- 页面标题 -->
      <h1 class="page-title">用户反馈中心</h1>

      <div class="form-card">
        <!-- 1. 反馈输入模块 -->
        <div class="section-label">1. 反馈内容</div>

        <div class="form-group">
          <div class="form-label">
            请输入您对网页版青寓集的反馈或建议吧～
            <span class="required">*</span>
          </div>

          <!-- 切换单选按钮 -->
          <div class="toggle-group">
            <button
              :class="['toggle-btn', { active: feedbackType === 'suggestion' }]"
              @click="feedbackType = 'suggestion'"
            >
              我要提功能 / 体验建议
            </button>
            <button
              :class="['toggle-btn', { active: feedbackType === 'bug' }]"
              @click="feedbackType = 'bug'"
            >
              我要反馈故障
            </button>
          </div>

          <!-- 大文本输入框 -->
          <div class="textarea-wrapper">
            <textarea
              v-model="feedbackContent"
              class="feedback-textarea"
              placeholder="请描述青寓集使用过程中遇到的问题，如某个功能无法使用 / 不好用、流程受阻、页面卡顿、或其他产品建议"
              :maxlength="500"
              rows="6"
            ></textarea>
            <div class="char-count">{{ feedbackContent.length }} / 500</div>
          </div>
        </div>

        <!-- 2. 问题页面分类选择 -->
        <div class="form-group">
          <div class="form-label">2. 问题页面</div>
          <div class="tag-group">
            <button
              v-for="page in pageOptions"
              :key="page"
              :class="['tag-btn', { active: selectedPage === page }]"
              @click="selectedPage = page"
            >
              {{ page }}
            </button>
          </div>
        </div>

        <!-- 3. 截图上传区域 -->
        <div class="form-group">
          <div class="form-label">
            3. 上传有效截图，可以让问题更快被发现哦！
            <span class="upload-limit-hint">(最多可以上传 5 张截图)</span>
          </div>

          <!-- 图片上传容器 -->
          <div
            class="upload-area"
            :class="{ 'has-images': previewImages.length > 0 }"
            @click="triggerUpload"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            @paste="onPaste"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.apng,.gif,.bmp"
              multiple
              style="display: none"
              @change="handleFileChange"
            />

            <!-- 空状态 -->
            <div v-if="previewImages.length === 0" class="upload-placeholder">
              <el-icon class="upload-icon"><PictureFilled /></el-icon>
              <span class="upload-text">可在此处粘贴、拖拽、上传多个图片</span>
              <span class="upload-hint">支持类型：JPG、JPEG、PNG、APNG、GIF、BMP</span>
            </div>

            <!-- 已有图片预览 -->
            <div v-else class="preview-grid" @click.stop>
              <div v-for="(img, index) in previewImages" :key="index" class="preview-item">
                <img :src="img" alt="截图预览" />
                <span class="remove-btn" @click="removeImage(index)">&times;</span>
              </div>
              <div v-if="previewImages.length < 5" class="upload-add" @click.stop="triggerUpload">
                <el-icon class="add-icon"><Plus /></el-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- 提交按钮 -->
        <button class="submit-btn" :disabled="isSubmitting" @click="handleSubmit">
          {{ isSubmitting ? '提交中...' : '提交反馈' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { PictureFilled, Plus } from '@element-plus/icons-vue'
import { uploadImages } from '@/api/item'
import { addFeedback } from '@/api/feedback'
import type { UserFeedback } from '@/api/feedback'

const fileInputRef = ref<HTMLInputElement | null>(null)

// 反馈类型: 'suggestion' | 'bug'，默认选中第一个
const feedbackType = ref<'suggestion' | 'bug'>('suggestion')

// 反馈内容
const feedbackContent = ref('')

// 问题页面选项，默认选中「搜索」
const pageOptions = ['首页', '搜索', '商品详情', '交易', '青寓集号', '其它']
const selectedPage = ref('搜索')

// 图片上传相关
const previewImages = ref<string[]>([])
const uploadedFiles = ref<File[]>([])
const isDragOver = ref(false)
const isSubmitting = ref(false)

const MAX_IMAGES = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/apng', 'image/gif', 'image/bmp']
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.apng', '.gif', '.bmp']

// 触发文件选择
const uploading = ref(false)
function triggerUpload() {
  if (uploading.value) return
  if (previewImages.value.length >= MAX_IMAGES) {
    ElMessage.warning(`最多只能上传 ${MAX_IMAGES} 张截图`)
    return
  }
  uploading.value = true
  fileInputRef.value?.click()
  setTimeout(() => {
    uploading.value = false
  }, 300)
}

// 处理文件变更
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return
  processFiles(Array.from(files))
  target.value = ''
}

// 统一处理文件添加
function processFiles(files: File[]) {
  const remaining = MAX_IMAGES - previewImages.value.length
  if (remaining <= 0) {
    ElMessage.warning(`最多只能上传 ${MAX_IMAGES} 张截图`)
    return
  }

  files.slice(0, remaining).forEach((file) => {
    // 格式检查
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      ElMessage.warning(
        `${file.name} 格式不支持，仅支持 JPG / JPEG / PNG / APNG / GIF / BMP，已跳过`,
      )
      return
    }

    uploadedFiles.value.push(file)
    previewImages.value.push(URL.createObjectURL(file))
  })

  if (files.length > remaining) {
    ElMessage.warning(`最多只能上传 ${MAX_IMAGES} 张截图，已自动截取前 ${remaining} 张`)
  }
}

// 拖拽相关
function onDragOver(e: DragEvent) {
  isDragOver.value = true
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    processFiles(Array.from(files))
  }
}

// 粘贴图片
function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  const imageFiles: File[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item?.type?.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        imageFiles.push(file)
      }
    }
  }
  if (imageFiles.length > 0) {
    processFiles(imageFiles)
  }
}

// 删除图片
function removeImage(index: number) {
  const removedUrl = previewImages.value[index]
  previewImages.value.splice(index, 1)
  uploadedFiles.value.splice(index, 1)
  if (removedUrl) {
    URL.revokeObjectURL(removedUrl)
  }
}

// 重置表单
function resetForm() {
  feedbackContent.value = ''
  feedbackType.value = 'suggestion'
  selectedPage.value = '搜索'
  previewImages.value.forEach((url) => URL.revokeObjectURL(url))
  previewImages.value = []
  uploadedFiles.value = []
}

// 提交反馈
async function handleSubmit() {
  if (!feedbackContent.value.trim()) {
    ElMessage.warning('请填写反馈内容')
    return
  }

  if (isSubmitting.value) return
  isSubmitting.value = true

  try {
    // 1. 如果有图片，先上传获取图片链接
    let screenshotUrls = ''
    if (uploadedFiles.value.length > 0) {
      const uploadRes = await uploadImages(uploadedFiles.value)
      if (uploadRes.code !== 1 || !uploadRes.data) {
        ElMessage.error(uploadRes.msg || '图片上传失败')
        return
      }
      screenshotUrls = uploadRes.data.map((pic) => pic.url).join(',')
    }

    // 2. 构建反馈数据并提交
    const feedback: UserFeedback = {
      uploadAccount: localStorage.getItem('username') || sessionStorage.getItem('username') || '',
      suggestType: feedbackType.value === 'suggestion' ? 1 : 2,
      suggestContent: feedbackContent.value.trim(),
      problemPage: selectedPage.value,
      screenshot: screenshotUrls,
    }

    const res = await addFeedback(feedback)
    if (res.code === 1) {
      ElMessage.success('感谢您的反馈！')
      resetForm()
    } else {
      ElMessage.error(res.msg || '反馈提交失败')
    }
  } catch {
    ElMessage.error('网络异常，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* ===== 页面主体 ===== */
.feedback-page {
  min-height: 100vh;
  background: #f5f5f7;
  padding: 48px 0 80px;
}

.page-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

.page-title {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 40px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: 0;
  color: #1d1d1f;
  text-align: center;
  margin: 0 0 32px;
}

.form-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 32px;
}

/* ===== 模块标签 ===== */
.section-label {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: #7a7a7a;
  text-transform: uppercase;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

/* ===== 表单通用 ===== */
.form-group {
  margin-bottom: 28px;
}

.form-label {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.24;
  letter-spacing: -0.374px;
  color: #1d1d1f;
  margin-bottom: 12px;
}

.required {
  color: #e53935;
  margin-left: 2px;
}

/* ===== 切换按钮组 ===== */
.toggle-group {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 11px;
  overflow: hidden;
}

.toggle-btn {
  flex: 1;
  padding: 10px 16px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.24px;
  color: #6e6e73;
  background: #ffffff;
  border: none;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
  outline: none;
}

.toggle-btn:first-child {
  border-right: 1px solid #e0e0e0;
}

.toggle-btn.active {
  background: #0066cc;
  color: #ffffff;
}

/* ===== 文本输入框 ===== */
.textarea-wrapper {
  position: relative;
}

.feedback-textarea {
  width: 100%;
  padding: 12px 17px 36px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #1d1d1f;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 11px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.feedback-textarea::placeholder {
  color: #7a7a7a;
}

.feedback-textarea:focus {
  border-color: #0066cc;
}

.char-count {
  position: absolute;
  right: 14px;
  bottom: 10px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  color: #b0b0b0;
}

/* ===== 标签选择组 ===== */
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-btn {
  padding: 8px 20px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.24px;
  color: #6e6e73;
  background: #f5f5f7;
  border: 1px solid #e0e0e0;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
  outline: none;
}

.tag-btn:hover {
  border-color: #0066cc;
  color: #0066cc;
}

.tag-btn.active {
  background: #0066cc;
  color: #ffffff;
  border-color: #0066cc;
}

/* ===== 上传区域 ===== */
.upload-limit-hint {
  font-size: 13px;
  font-weight: 400;
  color: #b0b0b0;
  margin-left: 4px;
}

.upload-area {
  border: 1px dashed #e0e0e0;
  border-radius: 11px;
  padding: 40px 32px;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.upload-area:hover {
  border-color: #0066cc;
}

.upload-area.has-images {
  padding: 16px;
  text-align: left;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 36px;
  color: #b0b0b0;
}

.upload-text {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.24px;
  color: #6e6e73;
}

.upload-hint {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  color: #b0b0b0;
}

/* ===== 图片预览网格 ===== */
.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.remove-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s ease;
}

.remove-btn:hover {
  background: rgba(0, 0, 0, 0.75);
}

.upload-add {
  width: 100px;
  height: 100px;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.upload-add:hover {
  border-color: #0066cc;
}

.add-icon {
  font-size: 24px;
  color: #b0b0b0;
}

/* ===== 提交按钮 ===== */
.submit-btn {
  display: block;
  width: 100%;
  margin-top: 32px;
  padding: 11px 22px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #ffffff;
  background: #0066cc;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.1s ease;
}

.submit-btn:hover {
  background: #0071e3;
}

.submit-btn:active {
  transform: scale(0.95);
}

.submit-btn:disabled {
  background: #a0c4e8;
  cursor: not-allowed;
  transform: none;
}
</style>
