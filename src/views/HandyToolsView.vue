<template>
    <div class="tools-page">
        <section class="tools-hero">
            <h1 class="hero-title">便捷工具</h1>
            <p class="hero-tagline">便捷工具，让校园生活更方便</p>
        </section>

        <section class="tools-grid-section">
            <div class="tools-grid">
                <div v-for="value in tools" class="tool-card">
                    <!-- 工具图片 -->
                    <div class="tool-image-wrapper">
                        <img :src="value.img" :alt="value.name" class="tool-image" />
                    </div>
                    <!-- 工具信息 -->
                    <div class="tool-info">
                        <!-- 工具名称 -->
                        <h3 class="tool-name">{{ value.name }}</h3>
                        <!-- 工具链接 -->
                        <span class="tool-link" @click="handleClick(value)">获取了解更多</span>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router';
const router = useRouter();

// 点击事件
const handleClick = (tool: ToolBase) => {
    const redirect = tool.redirect
    if (redirect) {
        router.push({ name: redirect })
    }
}
//基本类型
type ToolBase = {
    name: string;
    img: string;
    redirect: string;
};

// 工具列表
const tools = ref<Array<ToolBase>>([
    {
        name: '视频工具',
        img: '/VideoStitchingView.png',
        redirect: 'VideoStitching'
    },
    {
        name: '图片转GIF',
        img: '/Picture2DIFView.png',
        redirect: 'Picture2GIFView'
    }
])


</script>

<style scoped>
/* ===== CSS Variables (Apple Design Tokens) ===== */
:root {
    --color-primary: #0066cc;
    --color-primary-hover: #0071e3;
    --color-ink: #1d1d1f;
    --color-canvas: #ffffff;
    --color-canvas-parchment: #f5f5f7;
    --color-surface-tile-1: #272729;
    --color-surface-tile-2: #2a2a2c;
    --color-hairline: #e0e0e0;
    --color-body-muted: #86868b;

    --font-display: 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    --font-text: 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

    --rounded-lg: 18px;
    --rounded-sm: 8px;
    --rounded-pill: 9999px;

    --spacing-section: 80px;
    --spacing-xl: 32px;
    --spacing-lg: 24px;
    --spacing-md: 17px;
    --spacing-sm: 12px;
    --spacing-xs: 8px;

    --product-shadow: 0 3px 5px 30px rgba(0, 0, 0, 0.22);
}

/* ===== Page Base ===== */
.tools-page {
    background-color: var(--color-canvas-parchment);
    min-height: 100vh;
}

/* ===== Hero Section ===== */
.tools-hero {
    background-color: var(--color-canvas);
    text-align: center;
    padding: var(--spacing-section) var(--spacing-lg) var(--spacing-xl);
}

.hero-title {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.28px;
    color: var(--color-ink);
    margin: 0 0 var(--spacing-sm);
}

.hero-tagline {
    font-family: var(--font-text);
    font-size: 21px;
    font-weight: 400;
    line-height: 1.3;
    letter-spacing: 0.231px;
    color: var(--color-body-muted);
    margin: 0;
}

/* ===== Tools Grid Section ===== */
.tools-grid-section {
    padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-section);
    max-width: 1200px;
    margin: 0 auto;
}

.tools-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
}

/* ===== Tool Card (Apple Store Utility Card Style) ===== */
.tool-card {
    background-color: var(--color-canvas);
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-lg);
    padding: var(--spacing-lg);
    transition: transform 0.2s ease;
    cursor: pointer;
}

.tool-card:hover {
    transform: scale(1.02);
}

.tool-card:active {
    transform: scale(0.98);
}

/* Dark variant tile for alternating rhythm */
.tool-card-dark {
    background-color: var(--color-surface-tile-2);
    border-color: transparent;
}

.tool-card-dark .tool-name {
    color: #ffffff;
}

.tool-card-dark .tool-link {
    color: #2997ff;
}

/* ===== Tool Image ===== */
.tool-image-wrapper {
    border-radius: var(--rounded-sm);
    overflow: hidden;
    margin-bottom: var(--spacing-md);
    background-color: var(--color-canvas-parchment);
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tool-image {
    width: 80%;
    height: 80%;
    object-fit: contain;
    box-shadow: var(--product-shadow);
    border-radius: 4px;
}

/* ===== Tool Info ===== */
.tool-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.tool-name {
    font-family: var(--font-text);
    font-size: 17px;
    font-weight: 600;
    line-height: 1.24;
    letter-spacing: -0.374px;
    color: var(--color-ink);
    margin: 0;
}

.tool-link {
    font-family: var(--font-text);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.43;
    letter-spacing: -0.224px;
    color: var(--color-primary);
    text-decoration: none;
}

.tool-link:hover {
    text-decoration: underline;
    color: var(--color-primary-hover);
}

/* ===== Responsive ===== */
@media (max-width: 834px) {
    .tools-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .hero-title {
        font-size: 34px;
    }
}

@media (max-width: 640px) {
    .tools-grid {
        grid-template-columns: 1fr;
    }

    .tools-hero {
        padding: 48px var(--spacing-md) var(--spacing-lg);
    }

    .hero-title {
        font-size: 28px;
    }

    .hero-tagline {
        font-size: 17px;
    }

    .tools-grid-section {
        padding: var(--spacing-lg) var(--spacing-md) 48px;
    }
}
</style>