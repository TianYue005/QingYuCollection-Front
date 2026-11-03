<template>
  <NavBanner />
  <!-- 发闲置表单 -->
  <div class="post-unused-page">
    <div class="page-container">
      <h1 class="page-title">发闲置</h1>
      <div class="form-card">
        <!-- 基础信息 -->
        <div class="section-label">基础信息</div>

        <!-- 宝贝图片 -->
        <div class="form-group">
          <div class="form-label">
            宝贝图片
            <span class="required">*</span>
          </div>
          <div class="upload-area" @click="triggerUpload">
            <input
              ref="fileInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.bmp"
              multiple
              style="display: none"
              @change="handleFileChange"
            />
            <div v-if="previewImages.length === 0" class="upload-placeholder">
              <span class="upload-icon">+</span>
              <span class="upload-text">上传图片</span>
              <span class="upload-hint"
                >支持 JPG / JPEG / PNG / GIF / BMP 格式，单张最大 5MB，最多 4 张</span
              >
            </div>
            <div v-else class="preview-grid">
              <div v-for="(img, index) in previewImages" :key="index" class="preview-item">
                <img :src="img" alt="预览图片" />
                <span class="remove-btn" @click.stop="removeImage(index)">&times;</span>
              </div>
              <div class="upload-add" @click.stop="triggerUpload">
                <span class="upload-icon">+</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 宝贝描述 -->
        <div class="form-group">
          <div class="form-label">
            宝贝描述
            <span class="required">*</span>
          </div>
          <textarea
            v-model="form.description"
            class="desc-textarea"
            placeholder="描述一下宝贝品牌型号，货品来源，是否需要维修，是否有其他问题"
            rows="4"
          ></textarea>
        </div>

        <!-- 分类标签 -->
        <div class="form-group">
          <div class="form-label">
            分类标签
            <span class="required">*</span>
          </div>
          <div class="category-options">
            <button
              v-for="cat in categoryOptions"
              :key="cat"
              type="button"
              class="category-option"
              :class="{ active: form.category === cat }"
              @click="form.category = cat"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- 属性标签 -->
        <div class="form-group">
          <div class="form-label-attr">
            属性标签
          </div>
          <!-- 已选标签 -->
          <div class="attr-selected">
            <span v-if="form.attributes.length === 0" class="attr-placeholder">暂未选择标签</span>
            <span v-for="(tag, index) in form.attributes" :key="tag" class="attr-tag">
              {{ tag }}
              <span class="attr-tag-remove" @click="removeAttr(index)">&times;</span>
            </span>
          </div>
          <!-- 站点提供的可选标签 + 更多入口 -->
          <div class="preset-tags">
            <button
              v-for="tag in presetTags"
              :key="tag"
              type="button"
              class="preset-tag"
              :class="{ active: form.attributes.includes(tag) }"
              @click="togglePresetTag(tag)"
            >
              {{ tag }}
            </button>
            <button type="button" class="preset-tag more-tag" @click="toggleMoreTags">
              {{ moreTagsExpanded ? '收起' : '更多' }}
            </button>
          </div>
          <!-- 更多标签 -->
          <div v-if="moreTagsExpanded" class="more-tags-panel">
            <button
              v-for="tag in moreTags"
              :key="tag"
              type="button"
              class="preset-tag"
              :class="{ active: form.attributes.includes(tag) }"
              @click="togglePresetTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <!-- 价格 -->
        <h2 class="section-title">价格</h2>
        <div class="price-row">
          <div class="price-item">
            <div class="form-label">
              价格
              <span class="required">*</span>
            </div>
            <div class="price-input-wrapper">
              <span class="currency-symbol">&yen;</span>
              <input
                v-model="form.price"
                type="text"
                class="price-input"
                placeholder="00.00"
                @input="validateNumber('price', $event)"
              />
            </div>
          </div>
          <div class="price-item">
            <div class="form-label">原价</div>
            <div class="price-input-wrapper">
              <span class="currency-symbol">&yen;</span>
              <input
                v-model="form.originalPrice"
                type="text"
                class="price-input"
                placeholder="00.00"
                @input="validateNumber('originalPrice', $event)"
              />
            </div>
          </div>
        </div>

        <!-- 提交按钮 -->
        <button class="submit-btn" :disabled="submitting" @click="handleSubmit">
          {{ submitting ? '发布中...' : '发布闲置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { toast } from '@/utils/message'
import NavBanner from '@/components/NavBanner.vue'
import { uploadImages, addItem } from '@/api/item'

const fileInputRef = ref<HTMLInputElement | null>(null)
const previewImages = ref<string[]>([])
const categoryOptions = ['电子产品', '饰品', '家居', '未知']
// 高频标签，直接展示在外部
const presetTags = ['99新', '急出', '自提', '包邮', '可小刀']
// 其余标签，收在“更多”里
const moreTags = [
  '全新未拆',
  '仅拆封',
  '轻微使用痕迹',
  '配件齐全',
  '保修期内',
  '支持验货',
  '不议价',
  '可换',
  '毕业出',
  '急用钱',
  '礼盒装',
]
// 标签全量列表，用于生成 IntTag 位图（位置即二进制位）
const allTags = [...presetTags, ...moreTags]
const moreTagsExpanded = ref(false)

const form = reactive({
  category: '',
  description: '',
  price: '',
  originalPrice: '',
  attributes: [] as string[],
  images: [] as File[],
})

type Submitting = {
  value: boolean
}

// 触发文件上传
const uploading = ref(false)
function triggerUpload() {
  if (uploading.value) return
  uploading.value = true
  fileInputRef.value?.click()
  // 延迟解锁，避免连续点击
  setTimeout(() => {
    uploading.value = false
  }, 300)
}
// 处理文件上传
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return

  // 限制最大上传张数（4张）
  const MAX_FILES = 4
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  // 检查当前已上传数量
  if (form.images.length >= MAX_FILES) {
    toast.warning(`最多只能上传 ${MAX_FILES} 张图片`)
    target.value = ''
    return
  }

  // 计算还可上传的数量
  const remainingSlots = MAX_FILES - form.images.length

  Array.from(files)
    .slice(0, remainingSlots)
    .forEach((file) => {
      // 格式检查：只允许 jpg / jpeg / png / gif / bmp
      const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedExts.includes(ext)) {
        toast.warning(`${file.name} 格式不支持，仅支持 JPG / JPEG / PNG / GIF / BMP，已跳过`)
        return
      }

      // 文件大小检查：限制单张 5MB
      if (file.size > MAX_FILE_SIZE) {
        toast.warning(`${file.name} 超过 5MB 限制，已跳过`)
        return
      }

      form.images.push(file)
      previewImages.value.push(URL.createObjectURL(file))
    })

  // 如果还有剩余文件未处理，提示用户
  if (files.length > remainingSlots) {
    toast.warning(`最多只能上传 ${MAX_FILES} 张图片，已自动截取前 ${remainingSlots} 张`)
  }

  target.value = ''
}

function removeImage(index: number) {
  const removedUrl = previewImages.value[index]
  previewImages.value.splice(index, 1)
  form.images.splice(index, 1)
  if (removedUrl) {
    URL.revokeObjectURL(removedUrl)
  }
}

// 站点标签点选/取消
function togglePresetTag(tag: string) {
  const index = form.attributes.indexOf(tag)
  if (index > -1) {
    form.attributes.splice(index, 1)
  } else {
    form.attributes.push(tag)
  }
}

function removeAttr(index: number) {
  form.attributes.splice(index, 1)
}

// 展开/收起更多标签
function toggleMoreTags() {
  moreTagsExpanded.value = !moreTagsExpanded.value
}

// 根据已选标签生成整数标签（位图：标签在 allTags 中的下标对应二进制位）
function buildIntTag(tags: string[]) {
  return tags.reduce((mask, tag) => {
    const index = allTags.indexOf(tag)
    return index > -1 ? mask | (1 << index) : mask
  }, 0)
}

function validateNumber(field: 'price' | 'originalPrice', e: Event) {
  const target = e.target as HTMLInputElement
  const val = target.value.replace(/[^\d.]/g, '')
  if (val.split('.').length > 2) {
    target.value = val.slice(0, -1)
    return
  }
  form[field] = val
}

const submitting = ref(false)

async function handleSubmit() {
  if (previewImages.value.length === 0) {
    toast.warning('请上传宝贝图片')
    return
  }
  if (!form.description.trim()) {
    toast.warning('请填写宝贝描述')
    return
  }
  if (!form.category) {
    toast.warning('请选择分类标签')
    return
  }
  if (!form.price) {
    toast.warning('请填写价格')
    return
  }

  submitting.value = true
  try {
    // 第一步：上传图片，获取图片信息（含 url、width、height）
    const uploadRes = await uploadImages(form.images)
    if (uploadRes.code !== 1) {
      toast.error(uploadRes.msg || '图片上传失败')
      return
    }
    const pictures = uploadRes.data

    // 第二步：将图片信息（含 url、宽、高）与商品表单数据一同提交
    const addRes = await addItem({
      image: pictures,
      description: form.description.trim(),
      price: Number(form.price),
      originalPrice: Number(form.originalPrice) || 0,
      // 规格属性：单个分类标签（电子产品、饰品等）
      specs: form.category,
      // 标签：属性标签（99新、急出等）
      tag: form.attributes,
      // 标签的整数化存储形式
      IntTag: buildIntTag(form.attributes),
    })

    if (addRes.code === 1) {
      toast.success('发布成功')
      resetForm()
    } else {
      toast.error(addRes.msg || '商品上架失败')
    }
  } catch {
    toast.error('发布失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.category = ''
  form.description = ''
  form.price = ''
  form.originalPrice = ''
  form.attributes = []
  form.images = []
  previewImages.value.forEach((url) => URL.revokeObjectURL(url))
  previewImages.value = []
}
</script>

<style scoped>
/* ===== 页面主体 ===== */
.post-unused-page {
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

.form-group {
  margin-bottom: 24px;
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

/* 上传区域 */
.upload-area {
  border: 1px dashed #e0e0e0;
  border-radius: 11px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.upload-area:hover {
  border-color: #0066cc;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 32px;
  font-weight: 300;
  color: #7a7a7a;
  line-height: 1;
}

.upload-text {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #7a7a7a;
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

/* 预览网格 */
.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

/* 描述输入框 */
.desc-textarea {
  width: 100%;
  padding: 12px 17px;
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

.desc-textarea::placeholder {
  color: #7a7a7a;
}

.desc-textarea:focus {
  border-color: #0066cc;
}

/* 分类标签 */
.category-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-option {
  padding: 8px 20px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #1d1d1f;
  background: #f5f5f7;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.category-option:hover {
  border-color: #0066cc;
}

.category-option.active {
  background: #0066cc;
  border-color: #0066cc;
  color: #ffffff;
}

/* 属性标签 */
.attr-selected {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 17px;
  border: 1px solid #e0e0e0;
  border-radius: 11px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.attr-placeholder {
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #7a7a7a;
}

.attr-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #1d1d1f;
  background: #f5f5f7;
  border-radius: 9999px;
}

.attr-tag-remove {
  cursor: pointer;
  color: #7a7a7a;
  font-size: 16px;
  line-height: 1;
  transition: color 0.2s ease;
}

.attr-tag-remove:hover {
  color: #e53935;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-tag {
  padding: 6px 16px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: #1d1d1f;
  background: #f5f5f7;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.preset-tag:hover {
  border-color: #0066cc;
}

.preset-tag.active {
  background: #0066cc;
  border-color: #0066cc;
  color: #ffffff;
}

.more-tag {
  color: #7a7a7a;
  background: transparent;
  border-color: #e0e0e0;
}

.more-tag:hover {
  color: #0066cc;
}

.more-tags-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 11px;
}

.form-label-attr {
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
  display: flex;
  align-items: baseline;
  gap: 8px;
}

/* 价格区域 */
.section-title {
  font-family:
    'SF Pro Display',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: #1d1d1f;
  margin: 32px 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.price-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.price-item {
  flex: 1;
}

.price-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #e0e0e0;
  border-radius: 11px;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.price-input-wrapper:focus-within {
  border-color: #0066cc;
}

.currency-symbol {
  flex-shrink: 0;
  padding: 12px 0 12px 17px;
  font-family:
    'SF Pro Text',
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

.price-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 17px 12px 4px;
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
}

.price-input::placeholder {
  color: #7a7a7a;
}

/* 提交按钮 */
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
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
