<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import GomokuBoard from '../../components/fun/GomokuBoard.vue'
import { useGomokuGame } from '../../composables/useGomokuGame'
import { resolveAvatarUrl, avatarHue } from '../../composables/avatar'
import { getCurrent } from '../../api/fun/gomoku'

// 解构游戏状态和方法
const {
  gameId,
  status,
  moves,
  players,
  currentTurn,
  winner,
  isDraw,
  gameOver,
  isParticipant,
  isMyTurn,
  isRestartVoted,
  opponentRestartVoted,
  bothRestartVoted,
  colorAt,
  placeStone,
  enterRoom,
  createGame,
  joinGame,
  restart,
  leaveRoom,
} = useGomokuGame()

// 页面模式：loading 加载中 / empty 无房间 / canJoin 等待加入 / board 棋盘
const mode = ref<'loading' | 'empty' | 'canJoin' | 'board'>('loading')
const error = ref<string | null>(null)
const joining = ref(false)
const restarting = ref(false)

// 棋盘高亮：最后一步
const lastMove = computed(() => {
  if (moves.value.length === 0) return null
  const last = moves.value[moves.value.length - 1]
  return { x: last.x, y: last.y }
})

// 观战标识：进了棋盘但不是参与者
const isSpectator = computed(() => mode.value === 'board' && !isParticipant.value)

// 轮次文案
const turnText = computed(() => {
  const name = currentTurn.value === 'black' ? '黑方' : '白方'
  if (status.value === 'waiting') return '等待对手加入…'
  if (status.value === 'finished') return '对局结束'
  if (isMyTurn.value) return `轮到你（${name}）`
  return `等待对方落子（${name}）`
})

// 当前回合是否轮到某方（信息栏高亮）
function isTurnOf(color: 'black' | 'white'): boolean {
  return status.value === 'playing' && currentTurn.value === color
}

// 某方是否获胜（信息栏胜者标识）
function isWinnerOf(color: 'black' | 'white'): boolean {
  return winner.value === color
}

// 头像 URL（空字符串 = 无头像，显示占位首字符）
function avatarOf(avatar: string | null): string {
  return resolveAvatarUrl(avatar ?? undefined)
}

// 无头像占位：首字符 + 按 id 哈希取色
function avatarTextOf(username: string): string {
  return (username || '?').charAt(0)
}

function avatarStyleOf(id: number) {
  const hue = avatarHue(String(id))
  return {
    background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 30%))`,
  }
}

// ===== 入口：进入页面只查看，不占位 =====

async function onEnter() {
  mode.value = 'loading'
  error.value = null
  try {
    mode.value = await enterRoom()
  } catch {
    error.value = '进入房间失败，请重试'
    mode.value = 'loading'
  }
}

// ===== 加入房间（占位） =====

async function onClickJoin() {
  joining.value = true
  error.value = null
  try {
    // 再次确认房间状态（可能刚变）
    const res = await getCurrent()
    const game = res.data
    if (!game || game.status === 'finished') {
      // 无房间或已结束 → 创建（执黑）
      await createGame()
    } else {
      // waiting 或 playing → 加入（执白；本人重进幂等）
      await joinGame(game.id)
    }
    mode.value = 'board'
  } catch {
    error.value = '加入失败，房间状态可能已变化'
  } finally {
    joining.value = false
  }
}

// ===== 再来一局（投票制） =====

async function onRestart() {
  restarting.value = true
  try {
    await restart()
  } catch {
    // 重开失败保持现状
  } finally {
    restarting.value = false
  }
}

// 组件卸载时退出让位（路由切换/关闭页面）
onMounted(onEnter)
onUnmounted(() => {
  if (gameId.value !== null) {
    leaveRoom()
  }
})
</script>

<template>
  <div class="gomoku-layout">
    <!-- 加载中 -->
    <div v-if="mode === 'loading'" class="gomoku-panel">
      <h2 class="gomoku-info__title">五子棋</h2>
      <p class="gomoku-info__turn" v-if="!error">加载中…</p>
      <p v-if="error" class="gomoku-lobby__error">{{ error }}</p>
      <button v-if="error" class="gomoku-info__reset" @click="onEnter">重试</button>
    </div>

    <!-- 无房间（empty）：显示空棋盘 + "加入房间"按钮 -->
    <template v-else-if="mode === 'empty'">
      <GomokuBoard
        :color-at="colorAt"
        :place-stone="placeStone"
        :game-over="gameOver"
        disabled
        :last-move="null"
      />
      <aside class="gomoku-info">
        <h2 class="gomoku-info__title">五子棋</h2>
        <p class="gomoku-info__turn">暂无对局，点击加入开始</p>
        <button
          class="gomoku-info__reset"
          :disabled="joining"
          @click="onClickJoin"
        >
          {{ joining ? '加入中…' : '⚫ 加入房间' }}
        </button>
        <p v-if="error" class="gomoku-lobby__error">{{ error }}</p>
      </aside>
    </template>

    <!-- 等待加入（canJoin）：黑方在等，我是后来者 -->
    <template v-else-if="mode === 'canJoin'">
      <GomokuBoard
        :color-at="colorAt"
        :place-stone="placeStone"
        :game-over="gameOver"
        disabled
        :last-move="null"
      />
      <aside class="gomoku-info">
        <h2 class="gomoku-info__title">五子棋</h2>

        <div class="gomoku-player gomoku-player--waiting">
          <img
            v-if="avatarOf(players?.black.avatar ?? null)"
            :src="avatarOf(players?.black.avatar ?? null)"
            class="gomoku-player__avatar"
            alt="黑方头像"
          />
          <span
            v-else
            class="gomoku-player__avatar"
            :style="avatarStyleOf(players?.black.id ?? 0)"
          >
            {{ avatarTextOf(players?.black.username ?? '?') }}
          </span>
          <div class="gomoku-player__meta">
            <span class="gomoku-player__name">{{ players?.black.username }}</span>
            <span class="gomoku-player__badge">⚫ 黑方</span>
          </div>
        </div>

        <p class="gomoku-lobby__desc">已有玩家在等待，加入后立即开局</p>
        <button
          class="gomoku-info__reset"
          :disabled="joining"
          @click="onClickJoin"
        >
          {{ joining ? '加入中…' : '⚪ 加入房间' }}
        </button>
        <p v-if="error" class="gomoku-lobby__error">{{ error }}</p>
      </aside>
    </template>

    <!-- 棋盘（board）：参与者或观战 -->
    <template v-else>
      <GomokuBoard
        :color-at="colorAt"
        :place-stone="placeStone"
        :game-over="gameOver"
        :disabled="!isMyTurn"
        :last-move="lastMove"
      />

      <aside class="gomoku-info">
        <h2 class="gomoku-info__title">五子棋</h2>
        <p class="gomoku-info__turn">房间 {{ gameId }}</p>

        <!-- 等待对手 -->
        <p v-if="status === 'waiting'" class="gomoku-info__turn">等待对手加入…</p>

        <!-- 双方信息 -->
        <template v-else>
          <div
            class="gomoku-player"
            :class="{
              'gomoku-player--active': isTurnOf('black'),
              'gomoku-player--winner': isWinnerOf('black'),
            }"
          >
            <img
              v-if="avatarOf(players?.black.avatar ?? null)"
              :src="avatarOf(players?.black.avatar ?? null)"
              class="gomoku-player__avatar"
              alt="黑方头像"
            />
            <span
              v-else
              class="gomoku-player__avatar"
              :style="avatarStyleOf(players?.black.id ?? 0)"
            >
              {{ avatarTextOf(players?.black.username ?? '?') }}
            </span>
            <div class="gomoku-player__meta">
              <span class="gomoku-player__name">{{ players?.black.username }}</span>
              <span class="gomoku-player__badge">
                ⚫ 黑方{{ isWinnerOf('black') ? ' 🏆' : '' }}
              </span>
            </div>
          </div>

          <div
            class="gomoku-player"
            :class="{
              'gomoku-player--active': isTurnOf('white'),
              'gomoku-player--winner': isWinnerOf('white'),
            }"
          >
            <img
              v-if="players?.white && avatarOf(players.white.avatar)"
              :src="players?.white ? avatarOf(players.white.avatar) : ''"
              class="gomoku-player__avatar"
              alt="白方头像"
            />
            <span
              v-else
              class="gomoku-player__avatar"
              :style="avatarStyleOf(players?.white?.id ?? 0)"
            >
              {{ avatarTextOf(players?.white?.username ?? '?') }}
            </span>
            <div class="gomoku-player__meta">
              <span class="gomoku-player__name">{{ players?.white?.username }}</span>
              <span class="gomoku-player__badge">
                ⚪ 白方{{ isWinnerOf('white') ? ' 🏆' : '' }}
              </span>
            </div>
          </div>
        </template>

        <!-- 观战标识 -->
        <p v-if="isSpectator" class="gomoku-info__result">👁 观战中</p>

        <!-- 结果 -->
        <p v-if="winner" class="gomoku-info__result">
          🏆 {{ winner === 'black' ? '黑方' : '白方' }} 获胜！
        </p>
        <p v-else-if="isDraw" class="gomoku-info__result">🤝 平局</p>

        <!-- 轮次提示 -->
        <p v-if="status === 'playing'" class="gomoku-info__turn">
          {{ turnText }}
        </p>

        <!-- 再来一局（投票制）：仅参与者、finished 时显示 -->
        <template v-if="gameOver && isParticipant">
          <!-- 双方都已投票 → 即将重开 -->
          <p v-if="bothRestartVoted" class="gomoku-info__turn">正在重开…</p>
          <!-- 我已投票、对方未投 -->
          <button
            v-else-if="isRestartVoted"
            class="gomoku-info__reset"
            disabled
          >
            等待对方同意…
          </button>
          <!-- 对方已投票、我未投（显示"同意"） -->
          <button
            v-else-if="opponentRestartVoted"
            class="gomoku-info__reset"
            :disabled="restarting"
            @click="onRestart"
          >
            {{ restarting ? '重开中…' : '对方想再来一局 ✅ 同意' }}
          </button>
          <!-- 无人投票 -->
          <button
            v-else
            class="gomoku-info__reset"
            :disabled="restarting"
            @click="onRestart"
          >
            {{ restarting ? '重开中…' : '↻ 再来一局' }}
          </button>
        </template>
      </aside>
    </template>
  </div>
</template>

<style scoped>
/* 左右布局：棋盘 + 信息面板 */
.gomoku-layout {
  display: flex;
  gap: 24px;
  height: 100%;
  min-height: 0;
  overflow-x: auto;
}

/* 加载面板 */
.gomoku-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--panel-strong);
}

.gomoku-lobby__desc {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.gomoku-lobby__error {
  font-size: 13px;
  color: var(--pink);
}

/* 玩家信息行 */
.gomoku-player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  transition:
    border-color 0.2s,
    background 0.2s;
}

/* 当前回合方高亮 */
.gomoku-player--active {
  border-color: rgba(0, 240, 255, 0.4);
  background: rgba(0, 240, 255, 0.06);
}

/* 获胜方高亮 */
.gomoku-player--winner {
  border-color: rgba(255, 228, 92, 0.5);
  background: rgba(255, 228, 92, 0.08);
}

.gomoku-player--waiting {
  width: 100%;
  max-width: 360px;
  justify-content: center;
}

.gomoku-player__avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  object-fit: cover;
}

.gomoku-player__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gomoku-player__name {
  font-size: 14px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gomoku-player__badge {
  font-size: 12px;
  color: var(--muted);
}

/* 信息面板：右侧自适应宽度 */
.gomoku-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--panel-strong);
}

/* 标题：渐变字，与「乐」栏目风格一致 */
.gomoku-info__title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.14em;
  background: linear-gradient(120deg, var(--yellow), var(--cyan));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* 轮次提示 */
.gomoku-info__turn {
  font-size: 14px;
  color: var(--muted);
}

/* 结果提示 */
.gomoku-info__result {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

/* 操作按钮：底部对齐 */
.gomoku-info__reset {
  margin-top: auto;
  padding: 10px 16px;
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: var(--radius-md);
  background: rgba(0, 240, 255, 0.08);
  color: var(--cyan);
  font-size: 14px;
  font-weight: 600;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.gomoku-info__reset:hover {
  border-color: rgba(0, 240, 255, 0.6);
  background: rgba(0, 240, 255, 0.14);
}

.gomoku-info__reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>