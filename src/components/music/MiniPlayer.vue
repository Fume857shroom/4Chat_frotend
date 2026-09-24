<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CoverArt from './CoverArt.vue'
import PlayerControls from './PlayerControls.vue'
import QueuePanel from './QueuePanel.vue'
import { usePlayerStore } from '../../stores/music/player'

// 全站常驻小播放器：挂在 HomeView，与 AppSidebar 同级（fixed 定位，不进 .app-shell 的 grid）。
// 曲目 / 队列 / 播放状态一律读 player store —— 与「音乐播放」右栏是同一份状态，
// 任意一边操作另一边立刻跟着变，这里不留任何本地副本（只有拖动位置是本地跟手值）。
const player = usePlayerStore()

const root = ref<HTMLElement | null>(null)
/** 拖动中的实时位置（跟手），松手才写回 store 持久化 */
const pos = ref<{ x: number; y: number } | null>(player.miniPos)
const dragging = ref(false)
/** 窄屏退回底部通栏：此时禁用拖动 */
const docked = ref(false)
const showQueue = ref(false)

const EDGE = 12
/** 只有真的发生位移才算拖动，否则就是点按钮 */
const DRAG_THRESHOLD = 4
const DOCK_BREAKPOINT = 720

let pointerId: number | null = null
let startX = 0
let startY = 0
let originX = 0
let originY = 0
let moved = false

const track = computed(() => player.displayTrack)
const isExpanded = computed(() => player.miniExpanded)

const statusText = computed(() => {
  if (player.error) {
    return player.error
  }
  if (player.isLoading) {
    return '取址中...'
  }
  if (!player.hasTrack) {
    // 刷新后队列恢复了但没自动开播（浏览器不允许无手势播放）
    return '待播放'
  }
  return track.value?.artist || ''
})

const rootStyle = computed(() => {
  if (docked.value || !pos.value) {
    return {}
  }

  return {
    left: `${pos.value.x}px`,
    top: `${pos.value.y}px`,
    right: 'auto',
    bottom: 'auto',
  }
})

function sizeOf(): { w: number; h: number } {
  return {
    w: root.value?.offsetWidth || 248,
    h: root.value?.offsetHeight || 60,
  }
}

/** 每次 move 都按当前视口 clamp：拖出可视区就找不回来了 */
function clamp(point: { x: number; y: number }): { x: number; y: number } {
  const { w, h } = sizeOf()
  const maxX = Math.max(EDGE, window.innerWidth - w - EDGE)
  const maxY = Math.max(EDGE, window.innerHeight - h - EDGE)

  return {
    x: Math.min(Math.max(point.x, EDGE), maxX),
    y: Math.min(Math.max(point.y, EDGE), maxY),
  }
}

/** 还没拖过时（CSS 钉在右下角）反推出它的左上角坐标 */
function currentPoint(): { x: number; y: number } {
  if (pos.value) {
    return pos.value
  }

  const { w, h } = sizeOf()

  return { x: window.innerWidth - w - EDGE, y: window.innerHeight - h - EDGE }
}

function onPointerDown(e: PointerEvent) {
  if (docked.value || pointerId !== null) {
    return
  }

  const el = e.currentTarget as HTMLElement
  const start = clamp(currentPoint())

  pos.value = start
  originX = start.x
  originY = start.y
  startX = e.clientX
  startY = e.clientY
  moved = false
  pointerId = e.pointerId
  el.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (pointerId === null || e.pointerId !== pointerId) {
    return
  }

  const dx = e.clientX - startX
  const dy = e.clientY - startY

  if (!moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
    return
  }

  moved = true
  dragging.value = true
  pos.value = clamp({ x: originX + dx, y: originY + dy })
}

function onPointerUp(e: PointerEvent) {
  if (pointerId === null || e.pointerId !== pointerId) {
    return
  }

  release(e.currentTarget as HTMLElement)

  // 只有真拖过才写存储，点一下把手不该产生一条无意义的落盘
  if (moved && pos.value) {
    player.setMiniPos(pos.value)
  }
}

function onPointerCancel(e: PointerEvent) {
  if (pointerId === null || e.pointerId !== pointerId) {
    return
  }

  release(e.currentTarget as HTMLElement)
}

function release(el: HTMLElement) {
  if (pointerId !== null) {
    el?.releasePointerCapture?.(pointerId)
  }

  pointerId = null
  dragging.value = false
  moved = false
}

function onResize() {
  docked.value = window.innerWidth <= DOCK_BREAKPOINT

  if (!docked.value && pos.value) {
    pos.value = clamp(pos.value)
    player.setMiniPos(pos.value)
  }
}

function toggleExpand() {
  player.setMiniExpanded(!player.miniExpanded)
}

// 展开/收起会改变自身高度，位置要重新 clamp 一次，不能把下半截留在屏幕外
watch(
  () => player.miniExpanded,
  () => {
    showQueue.value = false

    if (pos.value && !docked.value) {
      pos.value = clamp(pos.value)
      player.setMiniPos(pos.value)
    }
  },
)

onMounted(() => {
  docked.value = window.innerWidth <= DOCK_BREAKPOINT
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <aside
    v-if="player.miniVisible"
    ref="root"
    class="mini-player"
    :class="{
      'mini-player--expanded': isExpanded,
      'mini-player--dragging': dragging,
      'mini-player--docked': docked,
    }"
    :style="rootStyle"
  >
    <!-- 把手行：整行可拖（按钮自己 stop 掉 pointerdown，不跟手不动） -->
    <div
      class="mini-player__bar"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <CoverArt
        :src="track?.coverUrl ?? ''"
        :seed="track?.songmid ?? ''"
        :text="track?.title ?? ''"
        :size="36"
        :radius="10"
      />

      <div class="mini-player__meta">
        <p class="mini-player__title" :title="track?.title">{{ track?.title }}</p>
        <p
          class="mini-player__sub"
          :class="{ 'mini-player__sub--error': !!player.error }"
          :title="statusText"
        >
          {{ statusText }}
        </p>
      </div>

      <!-- 收起态的快捷控件：展开后由下面那一排接管，不留两个播放键 -->
      <button
        v-if="!isExpanded || docked"
        type="button"
        class="mini-player__btn mini-player__btn--ghost"
        :title="player.isPlaying ? '暂停' : '播放'"
        :disabled="player.isLoading"
        @pointerdown.stop
        @click="player.togglePlayback()"
      >
        {{ player.isPlaying ? '❙❙' : '▶' }}
      </button>

      <button
        v-if="!isExpanded || docked"
        type="button"
        class="mini-player__btn mini-player__btn--ghost"
        title="下一首"
        @pointerdown.stop
        @click="player.next()"
      >
        ⏭
      </button>

      <button
        type="button"
        class="mini-player__btn mini-player__btn--grip"
        :class="{ 'mini-player__btn--up': isExpanded }"
        :title="isExpanded ? '收起' : '展开播放面板'"
        @pointerdown.stop
        @click="toggleExpand"
      >
        ⠿
      </button>

      <button
        type="button"
        class="mini-player__btn mini-player__btn--close"
        title="关闭小播放器"
        @pointerdown.stop
        @click="player.dismiss()"
      >
        ✕
      </button>
    </div>

    <template v-if="isExpanded && !docked">
      <PlayerControls />

      <button
        type="button"
        class="mini-player__btn mini-player__btn--wide"
        :class="{ 'mini-player__btn--on': showQueue }"
        :title="showQueue ? '收起播放队列' : '查看播放队列'"
        @click="showQueue = !showQueue"
      >
        ≡ 队列 {{ player.queue.length }}
      </button>

      <QueuePanel v-if="showQueue" :max-height="184" class="mini-player__queue" />
    </template>
  </aside>
</template>

<style scoped>
.mini-player {
  position: fixed;
  right: 16px;
  bottom: 16px;
  /* 低于弹窗遮罩（1000）：开着分享/详情弹窗时不该被一个会动的小窗压住 */
  z-index: 900;
  width: 248px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.07), transparent 40%),
    var(--panel-strong);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.mini-player--expanded {
  width: 320px;
}

.mini-player--dragging {
  cursor: grabbing;
  /* 拖动中禁用命中测试以外的交互抖动 */
  user-select: none;
}

.mini-player__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  /* 触屏上拖动不能顺手把页面滚走 */
  touch-action: none;
  cursor: grab;
}

.mini-player__meta {
  min-width: 0;
  flex: 1;
}

.mini-player__title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-player__sub {
  margin-top: 1px;
  color: var(--muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-player__sub--error {
  color: var(--pink);
}

.mini-player__btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  transition:
    color 0.2s,
    background 0.2s,
    border-color 0.2s;
}

.mini-player__btn:hover:not(:disabled) {
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
}

.mini-player__btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.mini-player__btn--ghost {
  border-color: var(--line);
  background: var(--panel-soft);
  color: var(--text);
}

.mini-player__btn--wide {
  /* 父级是纵向 flex，默认会被拉满一行，让它按内容收着 */
  align-self: flex-start;
  width: auto;
  padding: 0 10px;
  border-color: var(--line);
  background: var(--panel-soft);
  font-size: 11px;
  white-space: nowrap;
}

.mini-player__btn--on {
  border-color: rgba(0, 240, 255, 0.45);
  color: var(--cyan);
}

.mini-player__btn--grip {
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
}

.mini-player__btn--grip:hover {
  color: var(--cyan);
}

.mini-player__btn--up {
  color: var(--cyan);
}

.mini-player__btn--close:hover {
  color: var(--pink);
  background: rgba(255, 45, 85, 0.12);
}

.mini-player__queue {
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

/* 窄屏（侧边栏已隐藏）：退回底部通栏，禁用拖动，只留必要控件 */
@media (max-width: 720px) {
  .mini-player {
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    gap: 6px;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .mini-player__bar {
    cursor: default;
  }

  .mini-player__btn--grip {
    display: none;
  }
}
</style>
