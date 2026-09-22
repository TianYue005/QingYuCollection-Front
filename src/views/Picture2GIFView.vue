<template>
    <div class="tools-page">
        <!-- ===== Hero ===== -->
        <section class="tools-hero">
            <h1 class="hero-title">图片转 GIF</h1>
            <p class="hero-tagline">本地转换引擎 · 图片全程不会离开你的设备</p>
        </section>

        <section class="tool-section">
            <!-- 文件选择框常驻 DOM，保证工作区状态下也能继续添加图片 -->
            <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                hidden
                @change="onPick"
            />
            <!-- ===== 上传区域 ===== -->
            <div
                v-if="frames.length === 0"
                class="upload-card"
                :class="{ 'is-dragging': dragOver }"
                @click="openPicker"
                @dragover.prevent="dragOver = true"
                @dragleave.prevent="dragOver = false"
                @drop.prevent="onDrop"
            >
                <div class="upload-art" aria-hidden="true">
                    <div class="art-stack">
                        <span v-for="n in 3" :key="n" class="art-frame" :class="`art-frame-${n}`"></span>
                    </div>
                </div>
                <p class="upload-title">拖入或选择图片</p>
                <p class="upload-hint">支持 JPG、PNG、WebP、BMP 等常见格式 · 可一次选择多张</p>
                <button class="btn-primary btn-store-hero" @click.stop="openPicker">选择图片</button>
            </div>

            <!-- ===== 工作区 ===== -->
            <div v-else class="workspace">
                <!-- 帧序列 -->
                <div class="card">
                    <div class="card-head">
                        <h2 class="card-title">帧序列</h2>
                        <span class="card-count">{{ frames.length }} 帧</span>
                    </div>
                    <div class="frames-strip">
                        <div v-for="(f, i) in frames" :key="f.id" class="frame-item">
                            <img :src="f.url" :alt="f.name" class="frame-thumb" />
                            <span class="frame-index">{{ i + 1 }}</span>
                            <div class="frame-actions">
                                <button
                                    class="icon-btn"
                                    title="向前移动"
                                    :disabled="i === 0"
                                    @click="moveFrame(i, -1)"
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                                </button>
                                <button
                                    class="icon-btn"
                                    title="向后移动"
                                    :disabled="i === frames.length - 1"
                                    @click="moveFrame(i, 1)"
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                </button>
                                <button class="icon-btn is-danger" title="删除该帧" @click="removeFrame(i)">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div class="frame-name">{{ f.name }}</div>
                        </div>
                        <button class="frame-item frame-add" @click="openPicker">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
                            <span>添加</span>
                        </button>
                    </div>
                </div>

                <!-- 输出设置 -->
                <div class="card">
                    <h2 class="card-title">输出设置</h2>
                    <div class="settings-grid">
                        <div class="setting-row">
                            <label class="setting-label" for="interval">每帧时长（秒）</label>
                            <div class="stepper">
                                <button class="icon-btn" :disabled="interval <= 0.05" @click="adjustInterval(-0.1)">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14" /></svg>
                                </button>
                                <input
                                    id="interval"
                                    v-model.number="interval"
                                    type="number"
                                    class="text-input"
                                    min="0.05"
                                    max="10"
                                    step="0.05"
                                />
                                <button class="icon-btn" :disabled="interval >= 10" @click="adjustInterval(0.1)">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                </button>
                            </div>
                        </div>
                        <div class="setting-row">
                            <label class="setting-label" for="maxWidth">输出宽度（像素）</label>
                            <input
                                id="maxWidth"
                                v-model.number="maxWidth"
                                type="number"
                                class="text-input"
                                min="0"
                                max="4096"
                                step="50"
                            />
                            <span class="setting-note">{{ maxWidth > 0 ? '超过该宽度将按比例缩小' : '0 表示以最大帧尺寸为准' }}</span>
                        </div>
                        <div class="setting-row">
                            <label class="setting-label">播放方式</label>
                            <div class="segmented" role="group" aria-label="播放方式">
                                <button
                                    class="seg-option"
                                    :class="{ 'is-selected': !loop }"
                                    @click="loop = false"
                                >
                                    仅播放一次
                                </button>
                                <button
                                    class="seg-option"
                                    :class="{ 'is-selected': loop }"
                                    @click="loop = true"
                                >
                                    无限循环
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 操作栏 -->
                <div class="action-bar">
                    <button class="btn-primary btn-store-hero" :disabled="converting" @click="convert">
                        <span v-if="converting" class="spinner" aria-hidden="true"></span>
                        {{ converting ? statusText : '生成 GIF' }}
                    </button>
                    <button class="btn-secondary" :disabled="converting" @click="resetAll">清空重来</button>
                </div>
            </div>

            <!-- ===== 结果 ===== -->
            <div v-if="resultUrl" class="card result-card">
                <div class="card-head">
                    <h2 class="card-title">生成结果</h2>
                    <span v-if="resultSize" class="card-count">{{ resultSize }}</span>
                </div>
                <img :src="resultUrl" class="result-img" alt="GIF 预览" />
                <div class="result-actions">
                    <a class="btn-primary" :href="resultUrl" :download="resultName">下载 GIF</a>
                    <button class="btn-secondary" @click="convert">重新生成</button>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { toast } from '@/utils/message'
// ffmpeg 核心（本地打包，随应用分发，无需联网下载）
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

type FrameItem = {
    id: number
    file: File
    name: string
    url: string
    width: number
    height: number
}

const MAX_FRAMES = 100
// 本地核心加载失败时的 CDN 兜底（使用 toBlobURL 规避 MIME / CORS 问题）
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

const fileInput = ref<HTMLInputElement | null>(null)
const frames = ref<FrameItem[]>([])
const dragOver = ref(false)
const interval = ref(0.5)
const maxWidth = ref(0)
const loop = ref(true)
const converting = ref(false)
const statusText = ref('')
const resultUrl = ref('')
const resultName = ref('')
const resultSize = ref('')

let ffmpeg: FFmpeg | null = null
let idSeed = 0
let ffmpegLogs: string[] = []

function createFFmpeg(): FFmpeg {
    const engine = new FFmpeg()
    engine.on('log', ({ message }) => {
        if (!message) return
        ffmpegLogs.push(message)
        if (ffmpegLogs.length > 50) ffmpegLogs = ffmpegLogs.slice(-50)
    })
    return engine
}

const openPicker = () => fileInput.value?.click()

async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    const images = files.filter((f) => f.type.startsWith('image/'))
    const skipped = files.length - images.length
    if (skipped > 0) {
        toast.warning(`已跳过 ${skipped} 个非图片文件`)
    }
    for (const file of images) {
        if (frames.value.length >= MAX_FRAMES) {
            toast.warning(`最多支持 ${MAX_FRAMES} 帧，已截断`)
            break
        }
        const url = URL.createObjectURL(file)
        const { width, height } = await readImageSize(url)
        frames.value.push({
            id: idSeed++,
            file,
            name: file.name,
            url,
            width,
            height,
        })
    }
}

// 读取图片原始尺寸（用于转换时统一各帧画布）
function readImageSize(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => resolve({ width: 0, height: 0 })
        img.src = url
    })
}

// 统一转码为 PNG 字节：PNG 原样保留，其余格式（JPG/WebP 等）经 canvas 解码重编码。
// ffmpeg 的 image2 分离器按扩展名选择解码器（而非内容探测），若不转码，
// JPG 数据以 .png 命名会被当作 PNG 解码导致转换失败
async function toPngBytes(file: File): Promise<Uint8Array> {
    if (file.type === 'image/png') {
        const data = await fetchFile(file)
        return typeof data === 'string' ? new TextEncoder().encode(data) : data
    }
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 初始化失败')
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('图片转码失败')
    return new Uint8Array(await blob.arrayBuffer())
}

function onPick(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.length) {
        addFiles(input.files)
    }
    input.value = ''
}

function onDrop(e: DragEvent) {
    dragOver.value = false
    if (e.dataTransfer?.files?.length) {
        addFiles(e.dataTransfer.files)
    }
}

function removeFrame(i: number) {
    const removed = frames.value.splice(i, 1)[0]
    if (removed) URL.revokeObjectURL(removed.url)
}

function moveFrame(i: number, dir: number) {
    const j = i + dir
    const arr = frames.value
    if (j < 0 || j >= arr.length) return
    const moving = arr[i]
    if (!moving || !arr[j]) return
    arr[i] = arr[j]
    arr[j] = moving
}

function adjustInterval(delta: number) {
    interval.value = Math.min(10, Math.max(0.05, Math.round((interval.value + delta) * 100) / 100))
}

function resetAll() {
    frames.value.forEach((f) => URL.revokeObjectURL(f.url))
    frames.value = []
    if (resultUrl.value) {
        URL.revokeObjectURL(resultUrl.value)
        resultUrl.value = ''
    }
    resultName.value = ''
    resultSize.value = ''
    statusText.value = ''
}

async function getFFmpeg(): Promise<FFmpeg> {
    if (ffmpeg && ffmpeg.loaded) return ffmpeg
    if (!ffmpeg) ffmpeg = createFFmpeg()
    ffmpegLogs = []
    try {
        await ffmpeg.load({ coreURL, wasmURL })
    } catch (e) {
        console.warn('本地 ffmpeg 核心加载失败，回退到 CDN：', e)
        ffmpeg.terminate()
        ffmpeg = createFFmpeg()
        ffmpegLogs = []
        await ffmpeg.load({
            coreURL: await toBlobURL(`${CDN_BASE}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${CDN_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
        })
    }
    return ffmpeg
}

async function convert() {
    if (frames.value.length === 0) return
    converting.value = true
    try {
        statusText.value = '加载引擎中…'
        const engine = await getFFmpeg()

        statusText.value = '写入图片…'
        for (let i = 0; i < frames.value.length; i++) {
            const frame = frames.value[i]
            if (!frame) continue
            const data = await toPngBytes(frame.file)
            await engine.writeFile(`in${String(i).padStart(2, '0')}.png`, data)
        }

        statusText.value = '生成 GIF…'
        const fps = (1 / interval.value).toFixed(4)

        // 计算统一输出尺寸：取所有帧的最大宽高作为画布，保证各帧尺寸一致
        const dims = frames.value.filter((f) => f.width > 0 && f.height > 0)
        let outW = dims.length ? Math.max(...dims.map((f) => f.width)) : 0
        let outH = dims.length ? Math.max(...dims.map((f) => f.height)) : 0
        if (maxWidth.value > 0 && outW > 0) {
            const ratio = Math.min(maxWidth.value / outW, 1)
            outW = Math.max(1, Math.round(outW * ratio))
            outH = Math.max(1, Math.round(outH * ratio))
        }
        // 等比缩放至画布内 + 白色画布居中，并统一为 rgb8 像素格式。
        // 注：ffmpeg-wasm 5.1.4 下 palettegen/paletteuse 两遍管线会静默失败（输出 0 字节），
        // 因此采用单遍直编；fps 滤镜会导致丢帧，帧率由 -framerate 控制
        const vf =
            outW > 0 && outH > 0
                ? `scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=white,format=rgb8`
                : 'format=rgb8'
        const args = ['-framerate', fps, '-start_number', '0', '-i', 'in%02d.png', '-vf', vf]
        if (loop.value) {
            args.push('-loop', '0')
        }
        args.push('-y', 'out.gif')
        await engine.exec(args)
        const data = (await engine.readFile('out.gif')) as Uint8Array
        // ffmpeg-wasm 的 exec 在失败时不一定抛错，校验输出是否为空
        if (!data.length) {
            throw new Error('ffmpeg 未生成任何输出')
        }

        for (let i = 0; i < frames.value.length; i++) {
            await engine.deleteFile(`in${String(i).padStart(2, '0')}.png`)
        }
        await engine.deleteFile('out.gif')

        if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
        const blob = new Blob([new Uint8Array(data)], { type: 'image/gif' })
        resultUrl.value = URL.createObjectURL(blob)
        resultName.value = `picture2gif-${Date.now()}.gif`
        resultSize.value = formatSize(blob.size)
        statusText.value = '完成'
        toast.success('GIF 生成成功')
    } catch (e) {
        console.error('GIF 转换失败，ffmpeg 日志：', ffmpegLogs.join('\n'), e)
        const lastError = [...ffmpegLogs].reverse().find((l) => l.toLowerCase().includes('error'))
        toast.error(lastError ? `生成失败：${lastError.slice(0, 120)}` : '生成失败，请检查图片后重试')
    } finally {
        converting.value = false
    }
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

onBeforeUnmount(() => {
    frames.value.forEach((f) => URL.revokeObjectURL(f.url))
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
})
</script>

<style scoped>
/* ===== Apple 设计变量 ===== */
.tools-page {
    --color-primary: #0066cc;
    --color-primary-hover: #0071e3;
    --color-primary-on-dark: #2997ff;
    --color-ink: #1d1d1f;
    --color-ink-muted-48: #7a7a7a;
    --color-body-muted: #86868b;
    --color-canvas: #ffffff;
    --color-canvas-parchment: #f5f5f7;
    --color-hairline: #e0e0e0;
    --color-danger: #d70015;
    --font-display: 'SF Pro Display', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    --font-text: 'SF Pro Text', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    --rounded-lg: 18px;
    --rounded-md: 11px;
    --rounded-sm: 8px;
    --rounded-pill: 9999px;
    --shadow-product: 3px 5px 30px 0 rgba(0, 0, 0, 0.22);

    background-color: var(--color-canvas-parchment);
    min-height: 100vh;
    font-family: var(--font-text);
}

/* ===== Hero ===== */
.tools-hero {
    background-color: var(--color-canvas);
    text-align: center;
    padding: 80px 24px 48px;
}

.hero-title {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.28px;
    color: var(--color-ink);
    margin: 0 0 12px;
}

.hero-tagline {
    font-size: 21px;
    font-weight: 400;
    line-height: 1.3;
    letter-spacing: 0.231px;
    color: var(--color-body-muted);
    margin: 0;
}

/* ===== 主体容器 ===== */
.tool-section {
    max-width: 980px;
    margin: 0 auto;
    padding: 48px 24px 80px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* ===== 卡片 ===== */
.card {
    background-color: var(--color-canvas);
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-lg);
    padding: 24px;
}

.card-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 20px;
}

.card-title {
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 600;
    line-height: 1.19;
    letter-spacing: 0.231px;
    color: var(--color-ink);
    margin: 0;
}

.card-count {
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.224px;
    color: var(--color-ink-muted-48);
}

.card-actions {
    margin-left: auto;
}

/* ===== 上传区域 ===== */
.upload-card {
    background-color: var(--color-canvas);
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-lg);
    padding: 64px 24px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.2s ease;
}

.upload-card:hover {
    border-color: var(--color-primary-hover);
}

.upload-card:active {
    transform: scale(0.98);
}

.upload-card.is-dragging {
    border-color: var(--color-primary);
    background-color: var(--color-canvas-parchment);
}

.upload-art {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
}

.art-stack {
    position: relative;
    width: 112px;
    height: 88px;
}

.art-frame {
    position: absolute;
    width: 64px;
    height: 64px;
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-sm);
    background-color: var(--color-canvas-parchment);
    box-shadow: var(--shadow-product);
}

.art-frame-1 {
    left: 0;
    top: 8px;
    transform: rotate(-8deg);
}

.art-frame-2 {
    left: 24px;
    top: 0;
    z-index: 1;
    border-color: var(--color-primary);
}

.art-frame-3 {
    right: 0;
    top: 8px;
    transform: rotate(8deg);
}

.upload-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    line-height: 1.14;
    color: var(--color-ink);
    margin: 0 0 8px;
}

.upload-hint {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.43;
    letter-spacing: -0.224px;
    color: var(--color-ink-muted-48);
    margin: 0 0 24px;
}

/* ===== 帧序列 ===== */
.frames-strip {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 8px;
}

.frame-item {
    position: relative;
    flex: 0 0 96px;
    width: 96px;
    text-align: center;
}

.frame-thumb {
    width: 96px;
    height: 96px;
    object-fit: cover;
    border-radius: var(--rounded-sm);
    border: 1px solid var(--color-hairline);
    background-color: var(--color-canvas-parchment);
    display: block;
}

.frame-index {
    position: absolute;
    top: 6px;
    left: 6px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: var(--rounded-pill);
    background-color: rgba(29, 29, 31, 0.75);
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    line-height: 20px;
    text-align: center;
    letter-spacing: -0.12px;
}

.frame-actions {
    position: absolute;
    right: 6px;
    top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.frame-item:hover .frame-actions {
    opacity: 1;
}

.frame-name {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.3;
    letter-spacing: -0.12px;
    color: var(--color-ink-muted-48);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.frame-add {
    flex: 0 0 96px;
    width: 96px;
    height: 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px dashed var(--color-hairline);
    border-radius: var(--rounded-sm);
    background-color: transparent;
    color: var(--color-primary);
    font-family: var(--font-text);
    font-size: 14px;
    letter-spacing: -0.224px;
    cursor: pointer;
    transition: border-color 0.2s ease;
}

.frame-add:hover {
    border-color: var(--color-primary-hover);
}

/* ===== 设置 ===== */
.settings-grid {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.setting-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.setting-label {
    flex: 0 0 128px;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.24;
    letter-spacing: -0.374px;
    color: var(--color-ink);
}

.text-input {
    width: 110px;
    height: 36px;
    padding: 0 12px;
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-pill);
    background-color: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-text);
    font-size: 17px;
    text-align: center;
    transition: border-color 0.2s ease;
}

.text-input:focus {
    border-color: var(--color-primary-hover);
}

.text-input::-webkit-outer-spin-button,
.text-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.text-input {
    -moz-appearance: textfield;
    appearance: textfield;
}

.stepper {
    display: flex;
    align-items: center;
    gap: 8px;
}

.setting-note {
    font-size: 14px;
    line-height: 1.43;
    letter-spacing: -0.224px;
    color: var(--color-ink-muted-48);
}

/* 分段选择（Apple 配置器风格） */
.segmented {
    display: inline-flex;
    padding: 3px;
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-pill);
    background-color: var(--color-canvas-parchment);
}

.seg-option {
    padding: 6px 16px;
    border: none;
    border-radius: var(--rounded-pill);
    background-color: transparent;
    color: var(--color-ink);
    font-family: var(--font-text);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.29;
    letter-spacing: -0.224px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.seg-option.is-selected {
    background-color: var(--color-canvas);
    color: var(--color-primary);
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.seg-option:active {
    transform: scale(0.95);
}

/* ===== 操作栏 ===== */
.action-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: center;
    padding: 8px 0;
}

/* ===== 结果 ===== */
.result-card {
    text-align: center;
}

.result-img {
    max-width: 100%;
    max-height: 480px;
    border-radius: var(--rounded-md);
    box-shadow: var(--shadow-product);
    margin: 0 auto 24px;
    display: block;
    background-color: var(--color-canvas-parchment);
}

.result-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
}

/* ===== 按钮 ===== */
.btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 22px;
    border: none;
    border-radius: var(--rounded-pill);
    background-color: var(--color-primary);
    color: #ffffff;
    font-family: var(--font-text);
    font-size: 17px;
    font-weight: 400;
    line-height: 1.47;
    letter-spacing: -0.374px;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-primary:hover {
    background-color: var(--color-primary-hover);
}

.btn-primary:active {
    transform: scale(0.95);
}

.btn-primary:disabled {
    background-color: #7a7a7a;
    cursor: not-allowed;
}

.btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 11px 22px;
    border: 1px solid var(--color-primary);
    border-radius: var(--rounded-pill);
    background-color: var(--color-canvas);
    color: var(--color-primary);
    font-family: var(--font-text);
    font-size: 17px;
    line-height: 1.47;
    letter-spacing: -0.374px;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-secondary:hover {
    background-color: var(--color-canvas-parchment);
}

.btn-secondary:active {
    transform: scale(0.95);
}

.btn-secondary:disabled {
    border-color: var(--color-hairline);
    color: var(--color-ink-muted-48);
    cursor: not-allowed;
}

.btn-store-hero {
    font-size: 18px;
    font-weight: 300;
    padding: 14px 28px;
    line-height: 1;
}

.text-link {
    border: none;
    background: none;
    padding: 0;
    font-family: var(--font-text);
    font-size: 17px;
    line-height: 2.41;
    letter-spacing: -0.374px;
    color: var(--color-primary);
    cursor: pointer;
}

.text-link:hover {
    text-decoration: underline;
}

.text-link:active {
    transform: scale(0.95);
}

.icon-btn {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background-color: rgba(29, 29, 31, 0.72);
    color: #ffffff;
    cursor: pointer;
    transition: transform 0.1s ease, background-color 0.2s ease;
}

.icon-btn:hover {
    background-color: rgba(29, 29, 31, 0.9);
}

.icon-btn:active {
    transform: scale(0.9);
}

.icon-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.icon-btn.is-danger {
    background-color: rgba(215, 0, 21, 0.85);
}

.icon-btn.is-danger:hover {
    background-color: var(--color-danger);
}

/* ===== 加载动画 ===== */
.spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* ===== 响应式 ===== */
@media (max-width: 834px) {
    .hero-title {
        font-size: 34px;
    }

    .hero-tagline {
        font-size: 17px;
    }

    .tool-section {
        padding: 32px 16px 48px;
    }

    .setting-label {
        flex-basis: 100%;
    }
}

@media (max-width: 640px) {
    .tools-hero {
        padding: 48px 16px 32px;
    }

    .hero-title {
        font-size: 28px;
    }

    .upload-card {
        padding: 48px 16px;
    }

    .upload-title {
        font-size: 24px;
    }

    .action-bar {
        flex-direction: column;
    }

    .result-actions {
        flex-direction: column;
    }

    .result-actions .btn-primary,
    .result-actions .btn-secondary {
        width: 100%;
    }
}
</style>
