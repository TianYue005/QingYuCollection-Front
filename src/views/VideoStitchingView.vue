<template>
    <div class="tools-page">
        <!-- ===== Hero ===== -->
        <section class="tools-hero">
            <h1 class="hero-title">视频拼接</h1>
            <p class="hero-tagline">本地拼接引擎 · 视频全程不会离开你的设备</p>
        </section>

        <section class="tool-section">
            <!-- 文件选择框常驻 DOM，保证工作区状态下也能继续添加视频 -->
            <input
                ref="fileInput"
                type="file"
                accept="video/*"
                multiple
                hidden
                @change="onPick"
            />

            <!-- ===== 上传区域 ===== -->
            <div
                v-if="videos.length === 0"
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
                <p class="upload-title">拖入或选择视频</p>
                <p class="upload-hint">支持 MP4、WebM、MOV 等常见格式 · 可一次选择多个</p>
                <button class="btn-primary btn-store-hero" @click.stop="openPicker">选择视频</button>
            </div>

            <!-- ===== 工作区 ===== -->
            <div v-else class="workspace">
                <!-- 片段列表 -->
                <div class="card">
                    <div class="card-head">
                        <h2 class="card-title">拼接顺序</h2>
                        <span class="card-count">{{ videos.length }} 个片段 · 共 {{ totalDurationText }}</span>
                    </div>
                    <div class="clips-strip">
                        <div v-for="(clip, i) in videos" :key="clip.id" class="clip-item">
                            <video
                                :src="clip.url"
                                muted
                                playsinline
                                preload="metadata"
                                class="clip-thumb"
                            ></video>
                            <span class="clip-index">{{ i + 1 }}</span>
                            <span class="clip-duration">{{ formatDuration(clip.duration) }}</span>
                            <span v-if="trimRangeText(clip)" class="clip-trim">{{ trimRangeText(clip) }}</span>
                            <div class="clip-actions">
                                <button
                                    class="icon-btn is-accent"
                                    title="剪辑该片段"
                                    @click="openTrim(i)"
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                                </button>
                                <button
                                    class="icon-btn"
                                    title="向前移动"
                                    :disabled="i === 0"
                                    @click="moveVideo(i, -1)"
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                                </button>
                                <button
                                    class="icon-btn"
                                    title="向后移动"
                                    :disabled="i === videos.length - 1"
                                    @click="moveVideo(i, 1)"
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                </button>
                                <button class="icon-btn is-danger" title="删除该片段" @click="removeVideo(i)">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div class="clip-name" :title="clip.name">{{ clip.name }}</div>
                        </div>
                        <button class="clip-item clip-add" @click="openPicker">
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
                            <label class="setting-label" for="mode">合并方式</label>
                            <div class="segmented" id="mode" role="group" aria-label="合并方式">
                                <button
                                    class="seg-option"
                                    :class="{ 'is-selected': mergeMode === 'auto' }"
                                    @click="mergeMode = 'auto'"
                                >
                                    自动（推荐）
                                </button>
                                <button
                                    class="seg-option"
                                    :class="{ 'is-selected': mergeMode === 'force' }"
                                    @click="mergeMode = 'force'"
                                >
                                    强制统一转码
                                </button>
                            </div>
                            <span class="setting-note">
                                自动模式优先「直接合并」（速度快、无画质损失），片段编码或分辨率不一致时自动降级为统一转码
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 操作栏 -->
                <div class="action-bar">
                    <button class="btn-primary btn-store-hero" :disabled="merging" @click="merge">
                        <span v-if="merging" class="spinner" aria-hidden="true"></span>
                        {{ merging ? statusText : '开始拼接' }}
                    </button>
                    <button class="btn-secondary" :disabled="merging" @click="resetAll">清空重来</button>
                </div>
            </div>

            <!-- ===== 结果 ===== -->
            <div v-if="resultUrl" class="card result-card">
                <div class="card-head">
                    <h2 class="card-title">拼接结果</h2>
                    <span v-if="resultSize" class="card-count">{{ resultSize }}</span>
                </div>
                <div class="player-wrap">
                    <video ref="playerEl" class="video-js vjs-big-play-centered" playsinline></video>
                </div>
                <div class="result-actions">
                    <a class="btn-primary" :href="resultUrl" :download="resultName">下载视频</a>
                    <button class="btn-secondary" @click="merge">重新拼接</button>
                </div>
            </div>

            <!-- ===== 片段剪辑弹窗 ===== -->
            <el-dialog
                :model-value="editingIndex >= 0"
                title="片段剪辑"
                width="560px"
                class="trim-dialog"
                destroy-on-close
                @opened="onTrimDialogOpened"
                @closed="onTrimDialogClosed"
            >
                <template v-if="editingClip">
                    <p class="trim-file-name">
                        {{ editingClip.name }} · 总时长 {{ formatDuration(editingClip.duration) }}
                    </p>
                    <div class="trim-player-wrap">
                        <video ref="trimPreviewEl" class="video-js vjs-big-play-centered" playsinline></video>
                    </div>
                    <div class="trim-controls">
                        <div class="trim-field">
                            <span class="trim-label">开始（秒）</span>
                            <el-input-number
                                v-model="trimStartInput"
                                :min="0"
                                :max="editingClip.duration"
                                :step="0.5"
                                :precision="1"
                                style="width: 150px"
                            />
                            <button class="btn-secondary btn-sm" @click="markTrimPoint('start')">
                                设为当前
                            </button>
                        </div>
                        <div class="trim-field">
                            <span class="trim-label">结束（秒）</span>
                            <el-input-number
                                v-model="trimEndInput"
                                :min="0"
                                :max="editingClip.duration"
                                :step="0.5"
                                :precision="1"
                                style="width: 150px"
                            />
                            <button class="btn-secondary btn-sm" @click="markTrimPoint('end')">
                                设为当前
                            </button>
                        </div>
                    </div>
                    <p class="trim-hint">结束时间填 0 表示保留到结尾；播放到目标位置后点击「设为当前」即可取点</p>
                    <div class="trim-actions">
                        <button class="btn-secondary btn-sm" @click="previewTrimRange">预览选区</button>
                        <button class="btn-secondary btn-sm" @click="clearTrim">重置剪辑</button>
                    </div>
                </template>
                <template #footer>
                    <button class="btn-secondary" @click="closeTrimDialog">取消</button>
                    <button class="btn-primary" @click="saveTrim">保存剪辑</button>
                </template>
            </el-dialog>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { toast } from '@/utils/message'
// ffmpeg 核心（本地打包，随应用分发，无需联网下载）
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

type ClipItem = {
    id: number
    file: File
    name: string
    url: string
    duration: number
    width: number
    height: number
    // 剪辑范围（秒），0 表示不裁剪
    trimStart: number
    trimEnd: number
}

const MAX_CLIPS = 20
// 本地核心加载失败时的 CDN 兜底（使用 toBlobURL 规避 MIME / CORS 问题）
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'

const fileInput = ref<HTMLInputElement | null>(null)
const videos = ref<ClipItem[]>([])
const dragOver = ref(false)
const mergeMode = ref<'auto' | 'force'>('auto')
const merging = ref(false)
const statusText = ref('')
const resultUrl = ref('')
const resultName = ref('')
const resultSize = ref('')

// Video.js 播放器
const playerEl = ref<HTMLVideoElement | null>(null)
let player: ReturnType<typeof videojs> | null = null

let ffmpeg: FFmpeg | null = null
let idSeed = 0
let ffmpegLogs: string[] = []

const totalDurationText = computed(() =>
    formatDuration(videos.value.reduce((sum, clip) => sum + (clip.duration || 0), 0)),
)

function createFFmpeg(): FFmpeg {
    const engine = new FFmpeg()
    engine.on('log', ({ message }) => {
        if (!message) return
        ffmpegLogs.push(message)
        if (ffmpegLogs.length > 50) ffmpegLogs = ffmpegLogs.slice(-50)
    })
    engine.on('progress', ({ progress }) => {
        if (typeof progress === 'number' && progress > 0 && progress < 1) {
            statusText.value = `拼接中… ${Math.round(progress * 100)}%`
        }
    })
    return engine
}

const openPicker = () => fileInput.value?.click()

async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    const clips = files.filter((f) => f.type.startsWith('video/'))
    const skipped = files.length - clips.length
    if (skipped > 0) {
        toast.warning(`已跳过 ${skipped} 个非视频文件`)
    }
    for (const file of clips) {
        if (videos.value.length >= MAX_CLIPS) {
            toast.warning(`最多支持 ${MAX_CLIPS} 个片段，已截断`)
            break
        }
        const url = URL.createObjectURL(file)
        const meta = await readVideoMeta(url)
        videos.value.push({
            id: idSeed++,
            file,
            name: file.name,
            url,
            duration: meta.duration,
            width: meta.width,
            height: meta.height,
            trimStart: 0,
            trimEnd: 0,
        })
    }
}

// 读取视频时长与画面尺寸（用于列表展示与统一画布计算）
function readVideoMeta(url: string): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve) => {
        const el = document.createElement('video')
        el.preload = 'metadata'
        el.muted = true
        el.src = url
        el.onloadedmetadata = () =>
            resolve({
                duration: Number.isFinite(el.duration) ? el.duration : 0,
                width: el.videoWidth || 0,
                height: el.videoHeight || 0,
            })
        el.onerror = () => resolve({ duration: 0, width: 0, height: 0 })
    })
}

function formatDuration(sec: number): string {
    if (!Number.isFinite(sec) || sec <= 0) return '--:--'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
}

// 片段命名扩展名写入虚拟文件系统时沿用，便于 ffmpeg 识别容器
function safeExt(name: string): string {
    const dot = name.lastIndexOf('.')
    const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : 'mp4'
    return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'mp4'
}

// 数值转 ffmpeg 参数：去掉浮点噪声（如 1.9999999 -> 2）
function fmtSec(sec: number): string {
    return String(Math.round(sec * 1000) / 1000)
}

// 剪辑范围的时间显示（保留 0.1 秒精度，避免整秒截断导致范围看起来失真）
function formatTrimTime(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    const tenth = Math.floor((sec % 1) * 10)
    return `${m}:${String(s).padStart(2, '0')}.${tenth}`
}

// 是否需要剪辑该片段
function needsTrim(clip: ClipItem): boolean {
    return clip.trimStart > 0 || (clip.trimEnd > 0 && clip.trimEnd < clip.duration)
}

// 剪辑范围的展示文案（未剪辑返回空串）
function trimRangeText(clip: ClipItem): string {
    if (!needsTrim(clip)) return ''
    const end = clip.trimEnd > 0 ? clip.trimEnd : clip.duration
    return `✂ ${formatTrimTime(clip.trimStart)}–${formatTrimTime(end)}`
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

function removeVideo(i: number) {
    const removed = videos.value.splice(i, 1)[0]
    if (removed) URL.revokeObjectURL(removed.url)
}

function moveVideo(i: number, dir: number) {
    const j = i + dir
    const arr = videos.value
    if (j < 0 || j >= arr.length) return
    const moving = arr[i]
    const target = arr[j]
    if (!moving || !target) return
    arr[i] = target
    arr[j] = moving
}

// ===== 片段剪辑（Video.js 预览 + 起止取点） =====
const editingIndex = ref(-1)
const trimStartInput = ref(0)
const trimEndInput = ref(0)
const trimPreviewEl = ref<HTMLVideoElement | null>(null)
let trimPlayer: ReturnType<typeof videojs> | null = null

const editingClip = computed(() => {
    const i = editingIndex.value
    return i >= 0 ? (videos.value[i] ?? null) : null
})

function openTrim(i: number) {
    const clip = videos.value[i]
    if (!clip) return
    trimStartInput.value = clip.trimStart || 0
    trimEndInput.value = clip.trimEnd || 0
    editingIndex.value = i
}

function onTrimDialogOpened() {
    const clip = editingClip.value
    if (!clip || !trimPreviewEl.value) return
    trimPlayer = videojs(trimPreviewEl.value, {
        controls: true,
        fluid: true,
        preload: 'auto',
    })
    trimPlayer.src({ src: clip.url, type: clip.file.type || 'video/mp4' })
}

function onTrimDialogClosed() {
    if (trimPlayer) {
        trimPlayer.dispose()
        trimPlayer = null
    }
    editingIndex.value = -1
}

function closeTrimDialog() {
    editingIndex.value = -1
}

// 将当前播放进度写入开始/结束
function markTrimPoint(type: 'start' | 'end') {
    if (!trimPlayer) return
    const t = trimPlayer.currentTime() ?? 0
    const safe = Math.max(0, Number.isFinite(t) ? t : 0)
    if (type === 'start') {
        trimStartInput.value = safe
    } else {
        trimEndInput.value = safe
    }
}

// 从开始时间播放到结束时间，预览选区
function previewTrimRange() {
    const clip = editingClip.value
    if (!clip || !trimPlayer) return
    const duration = clip.duration > 0 ? clip.duration : Infinity
    const start = Math.min(trimStartInput.value, duration)
    const end = trimEndInput.value > 0 ? Math.min(trimEndInput.value, duration) : duration
    trimPlayer.currentTime(start)
    trimPlayer.play()
    const stopAt = end
    const onTime = () => {
        const player = trimPlayer
        if (player && (player.currentTime() ?? 0) >= stopAt) {
            player.pause()
            player.off('timeupdate', onTime)
        }
    }
    trimPlayer.on('timeupdate', onTime)
}

function clearTrim() {
    trimStartInput.value = 0
    trimEndInput.value = 0
}

function saveTrim() {
    const clip = editingClip.value
    if (!clip) return
    const start = Math.max(0, trimStartInput.value)
    const end = trimEndInput.value
    if (end > 0 && end <= start) {
        toast.warning('结束时间需大于开始时间')
        return
    }
    const normEnd = end > 0 ? Math.min(end, clip.duration) : 0
    clip.trimStart = start
    clip.trimEnd = normEnd
    if (clip.trimStart <= 0 && (clip.trimEnd <= 0 || clip.trimEnd >= clip.duration)) {
        clip.trimStart = 0
        clip.trimEnd = 0
    }
    closeTrimDialog()
    toast.success(needsTrim(clip) ? '已保存剪辑范围' : '剪辑范围已清除')
}

function resetAll() {
    videos.value.forEach((c) => URL.revokeObjectURL(c.url))
    videos.value = []
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

// 执行一次 ffmpeg 命令并校验输出非空（ffmpeg-wasm 的 exec 失败时不一定抛错）
async function execWithCheck(engine: FFmpeg, args: string[], outFile = 'out.mp4'): Promise<boolean> {
    try {
        await engine.deleteFile(outFile)
    } catch {
        /* 文件不存在，忽略 */
    }
    try {
        await engine.exec(args)
    } catch {
        return false
    }
    try {
        const out = (await engine.readFile(outFile)) as Uint8Array
        return out.length > 0
    } catch {
        return false
    }
}

// 多片段统一分辨率后的 filter_complex 拼接（处理编码/分辨率不一致的片段）
function buildFilterArgs(noAudio: boolean): string[] {
    const clips = videos.value
    const dims = clips.filter((c) => c.width > 0 && c.height > 0)
    let outW = dims.length ? Math.max(...dims.map((d) => d.width)) : 1280
    let outH = dims.length ? Math.max(...dims.map((d) => d.height)) : 720
    if (outW % 2) outW++
    if (outH % 2) outH++

    const inputs: string[] = []
    const videoChains: string[] = []
    const audioChains: string[] = []
    const videoLabels: string[] = []
    const audioLabels: string[] = []

    clips.forEach((clip, i) => {
        const ext = safeExt(clip.name)
        inputs.push('-i', `in${i}.${ext}`)
        videoChains.push(
            `[${i}:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p[v${i}]`,
        )
        videoLabels.push(`[v${i}]`)
        if (!noAudio) {
            audioChains.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${i}]`)
            audioLabels.push(`[a${i}]`)
        }
    })

    const n = clips.length
    const graph = noAudio
        ? [...videoChains, `${videoLabels.join('')}concat=n=${n}:v=1:a=0[v]`].join(';')
        : [
              ...videoChains,
              ...audioChains,
              `${videoLabels.join('')}${audioLabels.join('')}concat=n=${n}:v=1:a=1[v][a]`,
          ].join(';')

    const args: string[] = [...inputs, '-filter_complex', graph]
    args.push('-map', '[v]')
    if (!noAudio) args.push('-map', '[a]')
    args.push(
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        'out.mp4',
    )
    return args
}

async function merge() {
    if (videos.value.length === 0) return
    merging.value = true
    try {
        statusText.value = '加载引擎中…'
        const engine = await getFFmpeg()

        statusText.value = '写入片段…'
        for (let i = 0; i < videos.value.length; i++) {
            const clip = videos.value[i]
            if (!clip) continue
            const data = await fetchFile(clip.file)
            await engine.writeFile(`in${i}.${safeExt(clip.name)}`, data)
        }

        // 剪辑片段：先按设定范围裁剪并统一转码为 H.264，再参与拼接
        const trimmedIndexes = new Set<number>()
        for (let i = 0; i < videos.value.length; i++) {
            const clip = videos.value[i]
            if (!clip || !needsTrim(clip)) continue
            const start = clip.trimStart
            const end = clip.trimEnd > 0 ? Math.min(clip.trimEnd, clip.duration) : clip.duration
            const dur = end - start
            if (dur <= 0.05) {
                throw new Error(`第 ${i + 1} 个片段的剪辑范围无效`)
            }
            statusText.value = `剪辑片段 ${i + 1}/${videos.value.length}…`
            const ok = await execWithCheck(
                engine,
                [
                    '-ss',
                    fmtSec(start),
                    '-i',
                    `in${i}.${safeExt(clip.name)}`,
                    '-t',
                    fmtSec(dur),
                    '-c:v',
                    'libx264',
                    '-preset',
                    'veryfast',
                    '-crf',
                    '23',
                    '-c:a',
                    'aac',
                    '-b:a',
                    '128k',
                    '-movflags',
                    '+faststart',
                    `trim${i}.mp4`,
                ],
                `trim${i}.mp4`,
            )
            if (!ok) {
                throw new Error(`第 ${i + 1} 个片段剪辑失败，请检查该片段是否可正常解码`)
            }
            trimmedIndexes.add(i)
        }

        const list = videos.value
            .map((clip, i) =>
                trimmedIndexes.has(i) ? `file 'trim${i}.mp4'` : `file 'in${i}.${safeExt(clip.name)}'`,
            )
            .join('\n')
        await engine.writeFile('list.txt', new TextEncoder().encode(list))

        let ok = false
        // 方案一：直接合并（不转码，片段编码一致时最快且无损）
        if (mergeMode.value === 'auto') {
            statusText.value = '直接合并中…'
            ok = await execWithCheck(engine, [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                'list.txt',
                '-c',
                'copy',
                '-movflags',
                '+faststart',
                'out.mp4',
            ])
        }
        // 方案二：concat 重新编码（编码不一致但分辨率一致）
        if (!ok) {
            statusText.value = '统一转码拼接中…'
            ok = await execWithCheck(engine, [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                'list.txt',
                '-c:v',
                'libx264',
                '-preset',
                'veryfast',
                '-crf',
                '23',
                '-c:a',
                'aac',
                '-b:a',
                '128k',
                '-movflags',
                '+faststart',
                'out.mp4',
            ])
        }
        // 方案三：filter_complex 统一分辨率拼接（含音轨）
        if (!ok) {
            statusText.value = '统一画面拼接中…'
            ok = await execWithCheck(engine, buildFilterArgs(false))
        }
        // 方案四：同上，但仅保留画面（个别片段无音轨时 concat 过滤器无法对音频拼接）
        if (!ok) {
            statusText.value = '统一画面拼接中（仅画面）…'
            ok = await execWithCheck(engine, buildFilterArgs(true))
        }
        if (!ok) {
            throw new Error('所有拼接方案均失败，请确认片段均可正常解码')
        }

        const data = (await engine.readFile('out.mp4')) as Uint8Array
        // 清理虚拟文件系统
        for (let i = 0; i < videos.value.length; i++) {
            const clip = videos.value[i]
            if (!clip) continue
            await engine.deleteFile(`in${i}.${safeExt(clip.name)}`)
            await engine.deleteFile(`trim${i}.mp4`)
        }
        await engine.deleteFile('list.txt')
        await engine.deleteFile('out.mp4')

        if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
        const blob = new Blob([new Uint8Array(data)], { type: 'video/mp4' })
        resultUrl.value = URL.createObjectURL(blob)
        resultName.value = `video-stitch-${Date.now()}.mp4`
        resultSize.value = formatSize(blob.size)
        statusText.value = '完成'
        toast.success('视频拼接成功')
    } catch (e) {
        console.error('视频拼接失败，ffmpeg 日志：', ffmpegLogs.join('\n'), e)
        const lastError = [...ffmpegLogs].reverse().find((l) => l.toLowerCase().includes('error'))
        toast.error(lastError ? `拼接失败：${lastError.slice(0, 120)}` : '拼接失败，请检查视频后重试')
    } finally {
        merging.value = false
    }
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ===== Video.js 播放器 =====
onMounted(() => {
    if (!playerEl.value) return
    player = videojs(playerEl.value, {
        controls: true,
        fluid: true,
        preload: 'auto',
        playbackRates: [0.5, 1, 1.5, 2],
    })
    if (resultUrl.value) {
        player.src({ src: resultUrl.value, type: 'video/mp4' })
    }
})

// 结果卡片是 v-if 渲染，需等 DOM 更新（含 ref 绑定）后再创建播放器
watch(
    resultUrl,
    async (url) => {
        if (!url) return
        await nextTick()
        if (!playerEl.value) return
        if (player) {
            player.src({ src: url, type: 'video/mp4' })
        } else {
            player = videojs(playerEl.value, {
                controls: true,
                fluid: true,
                preload: 'auto',
                playbackRates: [0.5, 1, 1.5, 2],
            })
            player.src({ src: url, type: 'video/mp4' })
        }
    },
    { flush: 'post' },
)

onBeforeUnmount(() => {
    if (player) {
        player.dispose()
        player = null
    }
    videos.value.forEach((c) => URL.revokeObjectURL(c.url))
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

/* ===== 片段列表 ===== */
.clips-strip {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 8px;
}

.clip-item {
    position: relative;
    flex: 0 0 160px;
    width: 160px;
    text-align: center;
}

.clip-thumb {
    width: 160px;
    height: 96px;
    object-fit: cover;
    border-radius: var(--rounded-sm);
    border: 1px solid var(--color-hairline);
    background-color: var(--color-canvas-parchment);
    display: block;
}

.clip-index {
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

.clip-duration {
    position: absolute;
    right: 6px;
    bottom: 6px;
    height: 18px;
    padding: 0 6px;
    border-radius: var(--rounded-pill);
    background-color: rgba(29, 29, 31, 0.75);
    color: #ffffff;
    font-size: 11px;
    font-weight: 500;
    line-height: 18px;
    letter-spacing: -0.11px;
}

.clip-trim {
    position: absolute;
    left: 6px;
    bottom: 6px;
    height: 18px;
    padding: 0 6px;
    border-radius: var(--rounded-pill);
    background-color: rgba(0, 102, 204, 0.9);
    color: #ffffff;
    font-size: 11px;
    font-weight: 500;
    line-height: 18px;
    letter-spacing: -0.11px;
    white-space: nowrap;
}

.clip-actions {
    position: absolute;
    right: 6px;
    top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.clip-item:hover .clip-actions {
    opacity: 1;
}

.clip-name {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.3;
    letter-spacing: -0.12px;
    color: var(--color-ink-muted-48);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.clip-add {
    flex: 0 0 160px;
    width: 160px;
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

.clip-add:hover {
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
    flex: 0 0 100px;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.24;
    letter-spacing: -0.374px;
    color: var(--color-ink);
}

.setting-note {
    flex-basis: 100%;
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

.player-wrap {
    background-color: #000000;
    border-radius: var(--rounded-md);
    overflow: hidden;
    margin: 0 auto 24px;
    max-width: 860px;
    box-shadow: var(--shadow-product);
}

.player-wrap :deep(.video-js) {
    border-radius: var(--rounded-md);
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

.icon-btn.is-accent {
    background-color: rgba(0, 102, 204, 0.85);
}

.icon-btn.is-accent:hover {
    background-color: var(--color-primary);
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

/* ===== 片段剪辑弹窗（el-dialog teleport 到 body，需全局样式） ===== */
:global(.trim-dialog) {
    border-radius: 18px;
    overflow: hidden;
}

:global(.trim-dialog .el-dialog__title) {
    font-weight: 600;
    font-size: 18px;
}

:global(.trim-dialog .trim-file-name) {
    margin: 0 0 12px;
    font-size: 14px;
    color: #7a7a7a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

:global(.trim-dialog .trim-player-wrap) {
    background-color: #000000;
    border-radius: 11px;
    overflow: hidden;
    margin-bottom: 16px;
}

:global(.trim-dialog .trim-controls) {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
}

:global(.trim-dialog .trim-field) {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

:global(.trim-dialog .trim-label) {
    flex: 0 0 84px;
    font-size: 15px;
    font-weight: 600;
    color: #1d1d1f;
}

:global(.trim-dialog .trim-hint) {
    margin: 0 0 16px;
    font-size: 13px;
    color: #86868b;
}

:global(.trim-dialog .trim-actions) {
    display: flex;
    gap: 12px;
}

:global(.trim-dialog .btn-primary),
:global(.trim-dialog .btn-secondary) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 9px 18px;
    border-radius: 9999px;
    font-family: inherit;
    font-size: 15px;
    line-height: 1.47;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
}

:global(.trim-dialog .btn-primary) {
    border: none;
    background-color: #0066cc;
    color: #ffffff;
}

:global(.trim-dialog .btn-primary:hover) {
    background-color: #0071e3;
}

:global(.trim-dialog .btn-primary:active) {
    transform: scale(0.95);
}

:global(.trim-dialog .btn-secondary) {
    border: 1px solid #0066cc;
    background-color: #ffffff;
    color: #0066cc;
}

:global(.trim-dialog .btn-secondary:hover) {
    background-color: #f5f5f7;
}

:global(.trim-dialog .btn-secondary:active) {
    transform: scale(0.95);
}

:global(.trim-dialog .btn-sm) {
    padding: 7px 14px;
    font-size: 14px;
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
