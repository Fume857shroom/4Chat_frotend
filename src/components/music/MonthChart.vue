<script setup lang="ts">
import { onMounted } from 'vue'
import CoverArt from './CoverArt.vue'
import FavoriteButton from './FavoriteButton.vue'
import SongDetail from './SongDetail.vue'
import type { MusicChartItem } from '../../types/music'
import { usePlayerStore } from '../../stores/music/player'
import { useShareStore } from '../../stores/music/share'

// 一行三个点击区：封面=试听，歌名区=详情，留言条=详情
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

function onDetail(item: MusicChartItem) {
  void shareStore.openDetail(item.songmid)
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
        <div
          class="chart-row"
          :class="{
            'chart-row--current': player.track?.songmid === item.songmid,
            'chart-row--top': item.rank <= 3,
            'chart-row--open': shareStore.detailSongmid === item.songmid,
          }"
        >
          <button
            type="button"
            class="chart-row__play"
            :title="`试听 ${item.title}`"
            @click="onPlay(item)"
          >
            <CoverArt
              :src="item.coverUrl"
              :seed="item.songmid"
              :text="item.title"
              :size="44"
              :radius="10"
            />
            <span class="chart-row__play-hint">▶</span>
          </button>

          <button
            type="button"
            class="chart-row__main"
            :title="`查看 ${item.title} 的评分与留言`"
            @click="onDetail(item)"
          >
            <span class="chart-row__song">
              <span class="chart-row__rank">{{ item.rank }}</span>
              <span class="chart-row__name">{{ item.title }}</span>
              <span class="chart-row__artist">- {{ item.artist }}</span>
            </span>
            <span class="chart-row__stats">
              <span class="chart-row__score">{{ starsOf(item.avgScore) }}</span>
              <span class="chart-row__avg">{{ scoreText(item.avgScore) }} 分</span>
              <span class="chart-row__count">{{ item.shareCount }} 人推荐</span>
            </span>
          </button>

          <button
            type="button"
            class="chart-row__notes"
            :title="`查看 ${item.title} 的全部留言`"
            @click="onDetail(item)"
          >
            <span v-for="note in item.notes" :key="note.id" class="chart-row__note">
              <strong class="chart-row__note-who">{{ note.sharedName }}</strong>
              <span class="chart-row__note-star">{{ note.score }}分</span>
              <span class="chart-row__note-text">{{ note.note }}</span>
            </span>
            <span v-if="item.notes.length === 0" class="chart-row__note chart-row__note--empty">
              还没有别人的留言
            </span>
            <span class="chart-row__more">全部 {{ item.shareCount }} 条 ›</span>
          </button>

          <!-- 星在三个点击区之外，不参与「试听 / 看详情」，也不嵌套按钮 -->
          <FavoriteButton
            class="chart-row__fav"
            :songmid="item.songmid"
            :track-title="item.title"
          />
        </div>
      </li>
    </ol>

    <SongDetail v-if="shareStore.detailSongmid" @close="shareStore.closeDetail()" />
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
  padding: 0 4px 0 0;
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

/* --- 榜单行：一行三格，各自可点 --- */
.chart-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 260px) auto;
  align-items: stretch;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  transition:
    background 0.2s,
    border-color 0.2s;
}

/* 收藏星固定在首行最后一格，窄屏留言条换行时它不动 */
.chart-row__fav {
  grid-area: 1 / 4;
  align-self: center;
  justify-self: center;
  margin-right: 6px;
}

.chart-row:hover {
  border-color: rgba(255, 228, 92, 0.4);
  background: rgba(255, 228, 92, 0.07);
}

.chart-row--current {
  border-color: rgba(0, 240, 255, 0.5);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.12), rgba(255, 45, 85, 0.06));
}

.chart-row--open {
  border-color: rgba(0, 240, 255, 0.45);
}

.chart-row__play,
.chart-row__main,
.chart-row__notes {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.chart-row__play {
  position: relative;
  display: grid;
  place-items: center;
  padding: 10px 0 10px 10px;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}

/* 封面右上角的试听角标，hover 才显形，不占版面 */
.chart-row__play-hint {
  position: absolute;
  right: 4px;
  bottom: 6px;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: var(--cyan);
  font-size: 9px;
  opacity: 0;
  transition: opacity 0.2s;
}

.chart-row__play:hover .chart-row__play-hint,
.chart-row--current .chart-row__play-hint {
  opacity: 1;
}

.chart-row__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  min-width: 0;
  padding: 10px 10px;
}

.chart-row__notes {
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
  min-width: 0;
  padding: 10px 12px 10px 10px;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--muted);
  font-size: 12px;
}

.chart-row__notes:hover {
  background: rgba(0, 240, 255, 0.05);
}

.chart-row__song {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.chart-row__rank {
  flex-shrink: 0;
  width: 16px;
  color: var(--muted);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chart-row--top .chart-row__rank {
  color: var(--yellow);
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
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-row__note-who {
  flex-shrink: 0;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--cyan);
  font-weight: 600;
}

.chart-row__note-star {
  flex-shrink: 0;
  color: var(--yellow);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.chart-row__note-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
}

.chart-row__note--empty {
  color: rgba(255, 255, 255, 0.3);
}

.chart-row__more {
  color: rgba(0, 240, 255, 0.65);
  font-size: 11px;
}

/* 窄屏放不下三格：留言条换到第二行，收藏星仍守在首行右侧 */
@media (max-width: 1400px) {
  .chart-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .chart-row__notes {
    grid-column: 1 / -1;
    grid-row: 2;
    border-left: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding: 8px 10px;
  }

  .chart-row__fav {
    grid-area: 1 / 3;
  }
}
</style>
