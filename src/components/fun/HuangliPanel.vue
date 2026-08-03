<script setup lang="ts">
import type { DailyCalendar } from '../../api/calendar'

defineProps<{
  data: DailyCalendar | null
  loading: boolean
  error: string | null
  selectedDate: string
}>()

const emit = defineEmits<{
  retry: []
}>()

function parseChong(chong: string): { animal: string; gz: string } {
  const m = chong.match(/^\((.+)\)(.+)$/)
  if (m) {
    return { gz: m[1], animal: m[2] }
  }
  return { gz: '', animal: chong }
}

function weekdayOf(solarDate: string): string {
  const d = new Date(solarDate)
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[d.getDay()]
}
</script>

<template>
  <section class="huang-card">
    <!-- 加载中：skeleton 占位 -->
    <template v-if="loading">
      <div class="huang-skeleton">
        <div class="sk-block sk--w60"></div>
        <div class="sk-block sk--w40 sk--h32"></div>
        <div class="sk-block sk--w50"></div>
        <div class="sk-grid">
          <div class="sk-block"></div>
          <div class="sk-block"></div>
        </div>
        <div class="sk-block sk--h48"></div>
        <div class="sk-block sk--h48"></div>
        <div class="sk-block sk--w80"></div>
      </div>
    </template>

    <!-- 错误态 -->
    <template v-else-if="error">
      <div class="huang-error">
        <span class="huang-error__icon">!</span>
        <p class="huang-error__text">{{ error }}</p>
        <button class="huang-error__btn" @click="emit('retry')">重试</button>
      </div>
    </template>

    <!-- 有数据 -->
    <template v-else-if="data">
      <div class="huang-head">
        <div class="huang-head__solar">{{ data.solarDate }}</div>
        <div class="huang-head__week">{{ weekdayOf(data.solarDate) }}</div>
      </div>

      <div class="huang-lunar">{{ data.lunarDate }}</div>
      <div class="huang-ganzhi">{{ data.ganZhi }}</div>

      <!-- 信息格 -->
      <div class="huang-info">
        <div class="huang-info__item">
          <span class="huang-info__label">值神</span>
          <span class="huang-info__value">{{ data.shen }}</span>
        </div>
        <div class="huang-info__item">
          <span class="huang-info__label">冲煞</span>
          <span class="huang-info__value">
            {{ parseChong(data.chong).animal }}（{{ parseChong(data.chong).gz }}）
          </span>
        </div>
        <div v-if="data.jieQi" class="huang-info__item">
          <span class="huang-info__label">节气</span>
          <span class="huang-info__value huang-info__value--jieqi">{{ data.jieQi }}</span>
        </div>
      </div>

      <!-- 宜 -->
      <div v-if="data.yi.length > 0" class="huang-yiji">
        <div class="huang-yiji__label">宜</div>
        <div class="huang-yiji__tags">
          <span v-for="item in data.yi" :key="item" class="tag tag--yi">{{ item }}</span>
        </div>
      </div>

      <!-- 忌 -->
      <div v-if="data.ji.length > 0" class="huang-yiji">
        <div class="huang-yiji__label">忌</div>
        <div class="huang-yiji__tags">
          <span v-for="item in data.ji" :key="item" class="tag tag--ji">{{ item }}</span>
        </div>
      </div>

      <!-- 彭祖百忌 -->
      <div class="huang-pengzu">{{ data.pengZu }}</div>
    </template>

    <!-- 无数据且非加载/错误（初始状态） -->
    <div v-else class="huang-empty">选择一个日期查看黄历</div>
  </section>
</template>

<style scoped>
.huang-card {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(255, 228, 92, 0.05), rgba(0, 240, 255, 0.04)),
    var(--panel-strong);
  overflow-y: auto;
}

/* --- 头部 --- */
.huang-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}

.huang-head__solar {
  font-size: 16px;
  font-weight: 600;
}

.huang-head__week {
  font-size: 12px;
  color: var(--muted);
}

.huang-lunar {
  font-size: 28px;
  font-weight: 700;
  color: var(--cyan);
  line-height: 1.2;
}

.huang-ganzhi {
  font-size: 13px;
  color: var(--muted);
  letter-spacing: 0.06em;
}

/* --- 信息格 --- */
.huang-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.huang-info__item {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
}

.huang-info__label {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}

.huang-info__value {
  font-size: 13px;
  font-weight: 500;
}

.huang-info__value--jieqi {
  color: var(--pink);
}

/* --- 宜 / 忌 --- */
.huang-yiji {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.huang-yiji__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.tag {
  display: inline-block;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  line-height: 1.5;
}

.tag--yi {
  background: rgba(0, 240, 255, 0.12);
  color: var(--cyan);
  border: 1px solid rgba(0, 240, 255, 0.25);
}

.tag--ji {
  background: rgba(255, 45, 85, 0.12);
  color: var(--pink);
  border: 1px solid rgba(255, 45, 85, 0.25);
}

.huang-yiji__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* --- 彭祖百忌 --- */
.huang-pengzu {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.6;
  padding: 8px 10px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
}

/* --- 加载 skeleton --- */
.huang-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sk-block {
  height: 14px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  animation: sk-pulse 1.6s ease-in-out infinite;
}

.sk--w60 { width: 60%; }
.sk--w40 { width: 40%; }
.sk--w50 { width: 50%; }
.sk--w80 { width: 80%; }
.sk--h32 { height: 32px; }
.sk--h48 { height: 48px; }

.sk-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.sk-grid .sk-block {
  height: 48px;
}

@keyframes sk-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* --- 错误态 --- */
.huang-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  text-align: center;
}

.huang-error__icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 45, 85, 0.15);
  color: var(--pink);
  font-size: 18px;
  font-weight: 700;
}

.huang-error__text {
  font-size: 13px;
  color: var(--muted);
}

.huang-error__btn {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font-size: 12px;
  padding: 6px 20px;
  cursor: pointer;
}

.huang-error__btn:hover {
  border-color: var(--cyan);
}

/* --- 空状态 --- */
.huang-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--muted);
}
</style>