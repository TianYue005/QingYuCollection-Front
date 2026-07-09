<template>
  <div class="profile-page">
    <!-- 头部卡片：头像 + 基本信息 -->
    <div class="profile-card hero-card">
      <div class="avatar-section">
        <div class="avatar-wrapper">
          <img v-if="avatar" :src="avatar" alt="用户头像" class="avatar-img" />
          <div v-else class="avatar-placeholder">
            {{ (username || '用户').charAt(0) }}
          </div>
          <button class="avatar-edit-btn" aria-label="修改头像">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div class="hero-info">
        <h2 class="hero-username">{{ username }}</h2>
        <p class="hero-account">{{ account }}</p>
        <span class="status-badge" :class="status === 1 ? 'status-active' : 'status-frozen'">
          {{ status === 1 ? '正常' : '已冻结' }}
        </span>
      </div>
    </div>

    <!-- 信息列表卡片 -->
    <div class="profile-card info-card">
      <h3 class="card-title">基本信息</h3>
      <ul class="info-list">
        <li class="info-item">
          <span class="info-label">用户ID</span>
          <span class="info-value">{{ userId }}</span>
        </li>
        <li class="info-item">
          <span class="info-label">用户名</span>
          <div class="info-value-row">
            <span class="info-value">{{ username }}</span>
            <button class="text-link">修改</button>
          </div>
        </li>
        <li class="info-item">
          <span class="info-label">账号</span>
          <span class="info-value">{{ account }}</span>
        </li>
        <li class="info-item">
          <span class="info-label">状态</span>
          <div class="info-value-row">
            <span class="info-value" :class="status === 1 ? 'text-active' : 'text-frozen'">
              {{ status === 1 ? '正常' : '已冻结' }}
            </span>
            <button v-if="status !== 1" class="text-link">申诉</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 数据概览卡片 -->
    <div class="profile-card stats-card">
      <h3 class="card-title">数据概览</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">{{ level }}</span>
          <span class="stat-label">账号等级</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ credit }}</span>
          <span class="stat-label">信誉积分</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value stat-balance">{{ balance }}</span>
          <span class="stat-label">用户金额</span>
        </div>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="profile-card action-card">
      <button class="action-btn action-btn-primary">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M14.25 6.75L9 12L3.75 6.75"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        修改密码
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   Apple Design System — Profile Page
   ============================================ */

/* ---- Design Tokens ---- */
:root {
  --color-canvas: #ffffff;
  --color-canvas-parchment: #f5f5f7;
  --color-ink: #1d1d1f;
  --color-ink-muted-80: #333333;
  --color-ink-muted-48: #7a7a7a;
  --color-primary: #0066cc;
  --color-primary-focus: #0071e3;
  --color-hairline: #e0e0e0;
  --color-divider-soft: #f0f0f0;
  --color-success: #34c759;
  --color-warning: #ff3b30;

  --font-stack: 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-stack-display: 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --rounded-lg: 18px;
  --rounded-pill: 9999px;
}

/* ---- Page ---- */
.profile-page {
  font-family: var(--font-stack);
  background: var(--color-canvas-parchment);
  min-height: 100vh;
  padding: 40px 20px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ---- Card ---- */
.profile-card {
  background: var(--color-canvas);
  border-radius: var(--rounded-lg);
  width: 100%;
  max-width: 680px;
  padding: var(--spacing-xl);
  box-sizing: border-box;
}

/* ---- Hero Card ---- */
.hero-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding-top: 40px;
  padding-bottom: 40px;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  position: relative;
  width: 88px;
  height: 88px;
}

.avatar-img {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-placeholder {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--color-canvas-parchment);
  color: var(--color-ink-muted-48);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-stack-display);
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.374px;
}

.avatar-edit-btn {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--color-canvas);
  background: var(--color-canvas-parchment);
  color: var(--color-ink-muted-80);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s ease;
}

.avatar-edit-btn:hover {
  background: var(--color-divider-soft);
}

.hero-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-username {
  font-family: var(--font-stack-display);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.14;
  letter-spacing: 0.196px;
  color: var(--color-ink);
  margin: 0;
}

.hero-account {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink-muted-48);
  margin: 0 0 8px 0;
}

/* ---- Status Badge ---- */
.status-badge {
  display: inline-block;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  padding: 4px 12px;
  border-radius: var(--rounded-pill);
  width: fit-content;
}

.status-active {
  background: rgba(52, 199, 89, 0.12);
  color: var(--color-success);
}

.status-frozen {
  background: rgba(255, 59, 48, 0.12);
  color: var(--color-warning);
}

/* ---- Card Title ---- */
.card-title {
  font-family: var(--font-stack-display);
  font-size: 21px;
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: var(--color-ink);
  margin: 0 0 20px 0;
}

/* ---- Info List ---- */
.info-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-divider-soft);
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-item:first-child {
  padding-top: 0;
}

.info-label {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink-muted-48);
  flex-shrink: 0;
}

.info-value {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink);
  text-align: right;
}

.info-value-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text-active {
  color: var(--color-success);
}

.text-frozen {
  color: var(--color-warning);
}

/* ---- Text Link ---- */
.text-link {
  font-family: var(--font-stack);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.text-link:hover {
  text-decoration: underline;
}

/* ---- Stats Grid ---- */
.stats-grid {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.stat-value {
  font-family: var(--font-stack-display);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.18;
  letter-spacing: -0.374px;
  color: var(--color-ink);
}

.stat-balance {
  color: var(--color-primary);
}

.stat-label {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-48);
}

.stat-divider {
  width: 1px;
  height: 48px;
  background: var(--color-hairline);
}

/* ---- Action Card ---- */
.action-card {
  padding: 20px var(--spacing-xl);
}

.action-btn {
  font-family: var(--font-stack);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 22px;
  border-radius: var(--rounded-pill);
  border: none;
  cursor: pointer;
  transition:
    transform 0.1s ease,
    background-color 0.15s ease;
  -webkit-font-smoothing: antialiased;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn-primary {
  background: var(--color-primary);
  color: #ffffff;
}

.action-btn-primary:hover {
  background: var(--color-primary-focus);
}

.action-btn-primary:focus-visible {
  outline: 2px solid var(--color-primary-focus);
  outline-offset: 2px;
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .profile-page {
    padding: 20px 12px 60px;
    gap: 16px;
  }

  .profile-card {
    padding: 24px 20px;
  }

  .hero-card {
    flex-direction: column;
    text-align: center;
    padding-top: 32px;
    padding-bottom: 32px;
  }

  .hero-info {
    align-items: center;
  }

  .stats-grid {
    flex-direction: column;
    gap: 20px;
  }

  .stat-divider {
    width: 80%;
    height: 1px;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 0;
  }

  .info-value {
    text-align: left;
  }
}
</style>
