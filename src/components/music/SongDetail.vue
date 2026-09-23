<script setup lang="ts">
import { computed, ref } from 'vue'
import CoverArt from './CoverArt.vue'
import ShareDialog from './ShareDialog.vue'
import { usePlayerStore } from '../../stores/music/player'
import { useShareStore } from '../../stores/music/share'
import { useUserStore } from '../../stores/user'

// 榜单行点进来看到的完整评分：左侧歌曲 + 星级分布 + 我的评分入口，右侧当月全部留言
const emit = defineEmits<{
  close: []
}>()

const player = usePlayerStore()
const shareStore = useShareStore()
const userStore = useUserStore()

const showRate = ref(false)

const detail = computed(() => shareStore.detail)
const distribution = computed(() => detail.value?.stats.distribution ?? [0, 0, 0, 0, 0])
// 条形按最多那一档归一化，全 0 时兜底成 1 以免除出 Infinity
const maxCount = computed(() => Math.max(1, ...distribution.value))

const hint = computed(() => {
  const mine = detail.value?.mine
  if (!mine) {
    return ''
  }
  if (shareStore.ratingState === 'mineThisMonth') {
    return `你已在 ${monthLabel(mine.createdAt)} 推荐过这首歌`
  }
  return `你在 ${monthLabel(mine.createdAt)} 推荐过这首歌。一人一歌只计一次，所以本月不再重复占位；改评分仍然可以，但只会影响 ${monthLabel(mine.createdAt)} 的榜单`
})

function monthLabel(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function starsOf(score: number): string {
  const value = Math.min(5, Math.max(0, Math.round(score)))
  return `${'★'.repeat(value)}${'☆'.repeat(5 - value)}`
}

function barWidth(count: number): string {
  return `${Math.round((count / maxCount.value) * 100)}%`
}

function isMine(userId: number): boolean {
  return !!userStore.profile?.id && userStore.profile.id === userId
}

function onPlay() {
  if (detail.value) {
    void player.playTrack(detail.value.song)
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="detail-overlay" @click.self="emit('close')">
      <div class="song-detail" role="dialog" aria-label="歌曲评分详情">
        <header class="song-detail__header">
          <h3 class="song-detail__heading">评分与留言</h3>
          <span class="song-detail__month">{{ shareStore.chartMonth }}</span>
          <button type="button" class="song-detail__close" aria-label="关闭" @click="emit('close')">
            ✕
          </button>
        </header>

        <p v-if="shareStore.detailLoading" class="song-detail__tip">加载中...</p>
        <p v-else-if="shareStore.detailError" class="song-detail__tip song-detail__tip--error">
          {{ shareStore.detailError }}
        </p>
        <p v-else-if="!detail" class="song-detail__tip">没有可显示的评分</p>

        <div v-else class="song-detail__body">
          <!-- 左：歌曲 + 分布 + 我的评分 -->
          <section class="song-detail__main">
            <div class="song-detail__head">
              <CoverArt
                :src="detail.song.coverUrl"
                :seed="detail.song.songmid"
                :text="detail.song.title"
                :size="96"
                :radius="16"
              />
              <div class="song-detail__id">
                <p class="song-detail__name">{{ detail.song.title }}</p>
                <p class="song-detail__artist">{{ detail.song.artist }}</p>
                <p class="song-detail__score">
                  <span class="song-detail__stars">{{ starsOf(detail.stats.avgScore) }}</span>
                  <span class="song-detail__avg">{{ detail.stats.avgScore.toFixed(1) }}</span>
                  <span class="song-detail__count">{{ detail.stats.shareCount }} 人推荐</span>
                </p>
                <button
                  type="button"
                  class="song-detail__play"
                  :class="{ 'song-detail__play--on': player.track?.songmid === detail.song.songmid }"
                  @click="onPlay"
                >
                  ▶ 试听
                </button>
              </div>
            </div>

            <ul class="song-detail__dist">
              <li v-for="(count, index) in distribution" :key="index" class="song-detail__dist-row">
                <span class="song-detail__dist-label">{{ index + 1 }} 星</span>
                <span class="song-detail__dist-bar"><i :style="{ width: barWidth(count) }"></i></span>
                <span class="song-detail__dist-count">{{ count }}</span>
              </li>
            </ul>

            <div class="song-detail__mine">
              <template v-if="detail.mine">
                <p class="song-detail__mine-title">我的评分</p>
                <p class="song-detail__mine-stars">
                  <span class="song-detail__stars">{{ starsOf(detail.mine.score) }}</span>
                  <span>{{ detail.mine.score }} / 5</span>
                  <time class="song-detail__mine-when">{{ dayLabel(detail.mine.createdAt) }}</time>
                </p>
                <p class="song-detail__mine-note">{{ detail.mine.note || '（我没有留言）' }}</p>
              </template>
              <p v-if="hint" class="song-detail__hint">{{ hint }}</p>
              <button type="button" class="song-detail__rate" @click="showRate = true">
                {{ detail.mine ? '修改评分' : '评分并推荐' }}
              </button>
            </div>
          </section>

          <!-- 右：当月全部留言 -->
          <section class="song-detail__comments">
            <p class="song-detail__comments-title">
              本月留言
              <span class="song-detail__comments-count">{{ detail.list.length }} 条</span>
            </p>

            <p v-if="detail.list.length === 0" class="song-detail__tip">这个月还没人推荐这首歌</p>

            <ul v-else class="song-detail__list">
              <li v-for="item in detail.list" :key="item.id" class="song-comment">
                <span class="song-comment__head">
                  <strong class="song-comment__who">{{ item.sharedName }}</strong>
                  <span v-if="isMine(item.sharedBy)" class="song-comment__me">我</span>
                  <span class="song-comment__stars">{{ starsOf(item.score) }}</span>
                  <time class="song-comment__when">{{ dayLabel(item.createdAt) }}</time>
                </span>
                <span class="song-comment__note">{{ item.note || '（未留言，只打了分）' }}</span>
              </li>
            </ul>
          </section>
        </div>

        <ShareDialog
          v-if="showRate && detail"
          :track="detail.song"
          :existing="detail.mine ?? undefined"
          @success="showRate = false"
          @close="showRate = false"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.55);
}

.song-detail {
  width: min(860px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.05), transparent 24%),
    var(--panel);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.song-detail__header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
}

.song-detail__heading {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  background: linear-gradient(120deg, var(--yellow), var(--cyan));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.song-detail__month {
  margin-left: auto;
  padding: 3px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.song-detail__close {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.song-detail__close:hover {
  color: var(--text);
  border-color: rgba(255, 45, 85, 0.4);
}

.song-detail__tip {
  padding: 30px 18px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.song-detail__tip--error {
  color: var(--pink);
}

.song-detail__body {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 4fr);
  gap: 18px;
  min-height: 0;
  padding: 18px;
  overflow: hidden;
}

/* --- 左：歌曲信息 --- */
.song-detail__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.song-detail__head {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.song-detail__id {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.song-detail__name {
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-detail__artist {
  color: var(--muted);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-detail__score {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.song-detail__stars {
  color: var(--yellow);
  letter-spacing: 0.08em;
}

.song-detail__avg {
  font-family: var(--font-display);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.song-detail__count {
  color: var(--muted);
}

.song-detail__play {
  align-self: flex-start;
  margin-top: 4px;
  padding: 6px 16px;
  border: 1px solid rgba(0, 240, 255, 0.4);
  border-radius: 999px;
  background: rgba(0, 240, 255, 0.08);
  color: var(--cyan);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.song-detail__play:hover {
  background: rgba(0, 240, 255, 0.18);
}

.song-detail__play--on {
  border-color: rgba(255, 228, 92, 0.5);
  color: var(--yellow);
  background: rgba(255, 228, 92, 0.1);
}

/* --- 星级分布 --- */
.song-detail__dist {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.song-detail__dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.song-detail__dist-label {
  flex-shrink: 0;
  width: 32px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.song-detail__dist-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.song-detail__dist-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--yellow), var(--cyan));
  transition: width 0.25s;
}

.song-detail__dist-count {
  flex-shrink: 0;
  width: 22px;
  color: var(--muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* --- 我的评分 --- */
.song-detail__mine {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
}

.song-detail__mine-title {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.song-detail__mine-stars {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.song-detail__mine-when {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.38);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.song-detail__mine-note {
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.song-detail__hint {
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--yellow);
  background: rgba(255, 228, 92, 0.08);
  border: 1px solid rgba(255, 228, 92, 0.2);
  font-size: 12px;
  line-height: 1.6;
}

.song-detail__rate {
  align-self: flex-start;
  padding: 8px 20px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--cyan), #8dffcf);
  color: #081017;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.song-detail__rate:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(0, 240, 255, 0.22);
}

/* --- 右：留言列表 --- */
.song-detail__comments {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 0;
}

.song-detail__comments-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.song-detail__comments-count {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.song-detail__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0 4px 0 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.song-detail__list::-webkit-scrollbar {
  width: 6px;
}

.song-detail__list::-webkit-scrollbar-track {
  background: transparent;
}

.song-detail__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.song-comment {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
}

.song-comment__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.song-comment__who {
  color: var(--cyan);
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-comment__me {
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(0, 240, 255, 0.16);
  color: var(--cyan);
  font-size: 10px;
}

.song-comment__stars {
  margin-left: auto;
  color: var(--yellow);
  letter-spacing: 0.06em;
}

.song-comment__when {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.38);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.song-comment__note {
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 720px) {
  .song-detail__body {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .song-detail__main,
  .song-detail__list {
    overflow: visible;
  }

  .song-detail__list {
    max-height: 320px;
  }
}
</style>
