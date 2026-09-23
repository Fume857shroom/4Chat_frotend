<script setup lang="ts">
import { onMounted } from 'vue'
import CoverArt from './CoverArt.vue'
import type { MusicChartItem } from '../../types/music'
import { usePlayerStore } from '../../stores/music/player'
import { useShareStore } from '../../stores/music/share'

// 榜单条目不返回时长/封面：时长交给媒体元数据回填，封面走占位图
const player = usePlayerStore()
const shareStore = useShareStore()

onMounted(() => {
  void shareStore.fetchChart()
})

function onPlay(item: MusicChartItem) {
  void player.playTrack({
    songmid: item.songmid,
    title: item.title,
    artist: item.artist,
    duration: item.duration,
    coverUrl: item.coverUrl,
  })
}

function scoreText(avgScore: number): string {
  return Number.isFinite(avgScore) ? avgScore.toFixed(1) : '--'
}

function starsOf(score: number): string {
  const value = Math.min(5, Math.max(0, Math.round(score)))
  return `${'★'.repeat(value)}${'☆'.repeat(5 - value)}`
}
</script>

<template>
  <section class="month-chart">
    <header class="month-chart__header">
      <h3 class="month-chart__title">分享排行</h3>
      <label class="month-chart__picker">
        <span class="sr-only">选择月份</span>
        <input
          type="month"
          :value="shareStore.chartMonth"
          @change="shareStore.setChartMonth(($event.target as HTMLInputElement).value)"
        />
      </label>
    </header>

    <p v-if="shareStore.chartLoading && shareStore.chart.length === 0" class="month-chart__tip">
      加载中...
    </p>
    <p v-else-if="shareStore.chartError" class="month-chart__tip month-chart__tip--error">
      {{ shareStore.chartError }}
    </p>
    <p v-else-if="shareStore.chart.length === 0" class="month-chart__tip">本月还没有分享</p>

    <ol v-else class="month-chart__list">
      <li v-for="item in shareStore.chart" :key="item.songmid">
        <button
          type="button"
          class="chart-row"
          :class="{
            'chart-row--current': player.track?.songmid === item.songmid,
            'chart-row--top': item.rank <= 3,
          }"
          :title="`试听 ${item.title}`"
          @click="onPlay(item)"
        >
          <span class="chart-row__rank">{{ item.rank }}</span>
          <CoverArt :seed="item.songmid" :text="item.title" :size="40" :radius="10" />
          <span class="chart-row__body">
            <span class="chart-row__song">
              <span class="chart-row__name">{{ item.title }}</span>
              <span class="chart-row__artist">- {{ item.artist }}</span>
            </span>
            <span class="chart-row__stats">
              <span class="chart-row__score">{{ starsOf(item.avgScore) }}</span>
              <span class="chart-row__avg">{{ scoreText(item.avgScore) }} 分</span>
              <span class="chart-row__count">{{ item.shareCount }} 次分享</span>
            </span>
            <span v-if="item.topNote" class="chart-row__note">
              「{{ item.topNote }}」 —— {{ item.topSharedName }}
            </span>
          </span>
        </button>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.month-chart {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 228, 92, 0.06), transparent 30%),
    var(--panel);
  box-shadow: var(--shadow);
}

.month-chart__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-chart__title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: linear-gradient(120deg, var(--yellow), var(--cyan));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.month-chart__picker {
  margin-left: auto;
}

.month-chart__picker input {
  padding: 5px 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel-soft);
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  outline: none;
  color-scheme: dark;
}

.month-chart__picker input:focus {
  border-color: rgba(0, 240, 255, 0.5);
  color: var(--text);
}

.month-chart__tip {
  padding: 26px 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.month-chart__tip--error {
  color: var(--pink);
}

.month-chart__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.month-chart__list::-webkit-scrollbar {
  width: 6px;
}

.month-chart__list::-webkit-scrollbar-track {
  background: transparent;
}

.month-chart__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.month-chart__list > li {
  flex: 0 0 auto;
}

/* --- 榜单行 --- */
.chart-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.chart-row:hover {
  border-color: rgba(255, 228, 92, 0.4);
  background: rgba(255, 228, 92, 0.07);
}

.chart-row--current {
  border-color: rgba(0, 240, 255, 0.5);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.06));
}

.chart-row__rank {
  flex-shrink: 0;
  width: 22px;
  color: var(--muted);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chart-row--top .chart-row__rank {
  color: var(--yellow);
}

.chart-row__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.chart-row__song {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.chart-row__name {
  font-size: 14px;
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-row__artist {
  color: var(--muted);
  font-size: 12px;
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-row__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.chart-row__score {
  color: var(--yellow);
  letter-spacing: 0.06em;
}

.chart-row__avg {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.chart-row__count {
  color: var(--muted);
}

.chart-row__note {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
