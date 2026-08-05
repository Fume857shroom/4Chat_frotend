import { ref, computed, onScopeDispose } from 'vue'
import { useAuthStore } from '../stores/auth'
import type { Game, GameEvent, GameStatus, Move, Player } from '../api/fun/gomoku'
import {
  createGame as createGameApi,
  joinGame as joinGameApi,
  makeMove as makeMoveApi,
  getGame as getGameApi,
  getCurrent,
  restartGame as restartGameApi,
  leaveGame as leaveGameApi,
  subscribeGameEvents,
} from '../api/fun/gomoku'

export type RoomMode = 'loading' | 'empty' | 'canJoin' | 'board'

export function useGomokuGame() {
  // ===== 对局状态（全部来自后端） =====

  const gameId = ref<number | null>(null)
  const status = ref<GameStatus>('waiting')
  const moves = ref<Move[]>([])
  const blackPlayerId = ref(0)
  const whitePlayerId = ref(0)
  const winnerId = ref<number | null>(null)
  const restartVotes = ref<number[]>([])
  const players = ref<{ black: Player; white: Player | null } | null>(null)

  let eventSource: EventSource | null = null

  // ===== 派生状态 =====

  // 轮到谁：黑先白后，步数为偶数 → 黑方
  const currentTurn = computed(() =>
    moves.value.length % 2 === 0 ? 'black' : 'white',
  )

  const gameOver = computed(() => status.value === 'finished')

  // 平局：对局结束且无赢家
  const isDraw = computed(() => gameOver.value && winnerId.value === null)

  // 赢家颜色（以对局结束时的 winnerId 为准，后端判定）
  const winner = computed<'black' | 'white' | null>(() => {
    if (!gameOver.value || winnerId.value === null) return null
    return winnerId.value === blackPlayerId.value ? 'black' : 'white'
  })

  // 我的颜色：用当前登录用户 id 对比黑白方 id（观战者为 null）
  const auth = useAuthStore()
  const myUserId = computed(() => auth.user?.id ?? -1)
  const myColor = computed<'black' | 'white' | null>(() => {
    if (myUserId.value === blackPlayerId.value) return 'black'
    if (myUserId.value === whitePlayerId.value) return 'white'
    return null
  })

  // 我是参与者（非观战）
  const isParticipant = computed(() => myColor.value !== null)

  // 轮到我了吗：对局进行中 + 轮到我的颜色
  const isMyTurn = computed(
    () => status.value === 'playing' && currentTurn.value === myColor.value,
  )

  // 我已投"再来一局"票
  const isRestartVoted = computed(() => restartVotes.value.includes(myUserId.value))

  // 对方已投"再来一局"票（但我没投）
  const opponentRestartVoted = computed(() => {
    if (restartVotes.value.length === 0) return false
    return restartVotes.value.some(
      (id) => id !== myUserId.value,
    )
  })

  // 双方都已投票（即将重开）
  const bothRestartVoted = computed(() => restartVotes.value.length >= 2)

  // ===== 数据同步 =====

  // 用后端返回的 Game 全量覆盖本地状态（唯一数据源，杜绝增量不同步）
  function syncGame(game: Game) {
    gameId.value = game.id
    status.value = game.status
    moves.value = game.moves
    blackPlayerId.value = game.blackPlayerId
    whitePlayerId.value = game.whitePlayerId
    winnerId.value = game.winnerId
    restartVotes.value = game.restartVotes
    players.value = game.players
  }

  // 清空状态（回到初始空态）
  function resetState() {
    gameId.value = null
    status.value = 'waiting'
    moves.value = []
    blackPlayerId.value = 0
    whitePlayerId.value = 0
    winnerId.value = null
    restartVotes.value = []
    players.value = null
  }

  // 拉取最新对局（SSE 收到事件后调用，保证数据一致）
  async function refreshGame() {
    if (gameId.value === null) return
    try {
      syncGame(await getGameApi(gameId.value))
    } catch {
      // 拉取失败等下一次触发
    }
  }

  // ===== 进入房间（核心流程：不占位） =====

  // 点进五子棋后只查看房间，不占位
  // 无房间 → empty；waiting 非黑方 → canJoin；其余 → board（含观战）
  async function enterRoom(): Promise<RoomMode> {
    const game = await getCurrent()

    if (game === null) {
      // 房间不存在 → 显示空棋盘 + "加入房间"按钮（不占位）
      resetState()
      return 'empty'
    }

    if (game.status === 'waiting') {
      if (game.blackPlayerId === myUserId.value) {
        // 我是黑方：直接进棋盘等待对手（连 SSE 占位，60s 超时）
        syncGame(game)
        connectEventSource()
        return 'board'
      }
      // 非黑方：显示黑方信息 + "加入房间"按钮（不连 SSE）
      syncGame(game)
      return 'canJoin'
    }

    // playing / finished：参与者进棋盘，非参与者观战（观战连 SSE 不占位）
    syncGame(game)
    connectEventSource()
    return 'board'
  }

  // ===== 对局动作 =====

  // 创建/进入房间（"加入房间"按钮触发）
  async function createGame() {
    syncGame(await createGameApi())
    connectEventSource()
  }

  // 加入对局（本人重进幂等 200）
  async function joinGame(id: number) {
    syncGame(await joinGameApi(id))
    connectEventSource()
  }

  // 落子：本地校验 → 后端落子 → 全量同步
  async function placeStone(x: number, y: number): Promise<boolean> {
    if (gameId.value === null) return false
    if (!isMyTurn.value) return false
    if (colorAt(x, y) !== null) return false
    try {
      syncGame(await makeMoveApi(gameId.value, { x, y }))
      return true
    } catch {
      return false
    }
  }

  // 再来一局（投票制：第一票记录，第二票真正重开）
  async function restart() {
    syncGame(await restartGameApi())
  }

  // 离开页面 = 退出让位（sendBeacon，组件卸载时调用）
  function leaveRoom() {
    disconnect()
    leaveGameApi()
  }

  // ===== SSE 事件流 =====

  function connectEventSource() {
    if (gameId.value === null) return
    eventSource?.close()
    eventSource = subscribeGameEvents(gameId.value, handleEvent)
  }

  // 按事件类型分发处理
  async function handleEvent(event: GameEvent) {
    switch (event.type) {
      case 'connected':
        // 连接确认，无需处理
        break
      case 'player_left':
        // 对手退出 → 房间可能重置为 waiting 或删除
        try {
          await refreshGame()
          // 如果 refreshGame 后 gameId 仍存在但白方为空，状态已反映
        } catch {
          // 404 → 房间已删除，清空状态
          disconnect()
          resetState()
        }
        break
      case 'restart_request':
        // 对方想再来一局 → 刷新全量（restartVotes 会包含对方 id）
        await refreshGame()
        break
      default:
        // joined / move / finished / restart → 全量拉取
        await refreshGame()
        break
    }
  }

  function disconnect() {
    eventSource?.close()
    eventSource = null
  }

  // ===== 工具 =====

  // 棋子位置 → 颜色 Map（避免 225 个格子每次渲染都遍历 moves）
  const stoneMap = computed(() => {
    const map = new Map<string, 'black' | 'white'>()
    for (const move of moves.value) {
      map.set(`${move.x},${move.y}`, move.moveIndex % 2 === 0 ? 'black' : 'white')
    }
    return map
  })

  // 查格子：O(1) Map 查找，返回 'black' / 'white' / null（空）
  function colorAt(x: number, y: number): 'black' | 'white' | null {
    return stoneMap.value.get(`${x},${y}`) ?? null
  }

  // 组件卸载时自动断开 SSE
  onScopeDispose(disconnect)

  return {
    gameId,
    status,
    moves,
    restartVotes,
    players,
    currentTurn,
    winner,
    isDraw,
    gameOver,
    myColor,
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
    resetState,
  }
}