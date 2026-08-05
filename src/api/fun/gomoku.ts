import http from '../http'

export type GameStatus = 'waiting' | 'playing' | 'finished'

export interface Move {
  usersId: number
  moveIndex: number
  x: number
  y: number
}

export interface MovePayload {
  x: number
  y: number
}

// 玩家信息（附带在 Game.players 中，供信息栏展示头像/用户名）
export interface Player {
  id: number
  username: string
  avatar: string | null
}

export interface Game {
  id: number
  status: GameStatus
  blackPlayerId: number
  whitePlayerId: number
  winnerId: number | null
  moves: Move[]
  restartVotes: number[]
  // 黑方永不 null；白方在 waiting 时为 null
  players: {
    black: Player
    white: Player | null
  }
}

export function createGame() {
  return http.post<Game>('/api/v1/gomoku/new')
}

export function joinGame(gameId: number) {
  return http.post<Game>(`/api/v1/gomoku/join/${gameId}`)
}

export function makeMove(gameId: number, payload: MovePayload) {
  return http.post<Game>(`/api/v1/gomoku/move/${gameId}`, payload)
}

export function getGame(gameId: number) {
  return http.get<Game>(`/api/v1/gomoku/${gameId}`)
}

// SSE 事件类型：单房间模式下的事件流
// connected: 连接确认 / joined: 对手加入 / move: 落子 / finished: 结束 / player_left: 退出 / restart_request: 对方请求重开 / restart: 重开
export type GameEvent =
  | { type: 'connected' }
  | { type: 'joined' }
  | { type: 'move' }
  | { type: 'finished'; winnerId: number | null }
  | { type: 'player_left'; userId: number }
  | { type: 'restart_request'; byUserId: number }
  | { type: 'restart' }

// 获取当前房间：有对局返回 Game，无对局返回 null（首次进入/Redis 重启后）
export function getCurrent() {
  return http.get<Game | null>('/api/v1/gomoku/current')
}

// 重新开始：仅双方、finished 状态可调，败者执黑（id 不变，房间延续）
export function restartGame() {
  return http.post<Game>('/api/v1/gomoku/restart')
}

// 退出房间释放位置：离开页面时调用（sendBeacon，组件卸载时触发）
export function leaveGame() {
  const token = localStorage.getItem('token')
  const baseURL = import.meta.env.VITE_API_BASE_URL || ''
  navigator.sendBeacon(
    `${baseURL}/api/v1/gomoku/leave?token=${encodeURIComponent(token ?? '')}`,
  )
}

// 订阅对局事件流：EventSource 不是 axios，需要单独处理
// 返回 EventSource 实例，调用方负责关闭
export function subscribeGameEvents(
  gameId: number,
  onEvent: (event: GameEvent) => void,
): EventSource {
  const token = localStorage.getItem('token')
  const baseURL = import.meta.env.VITE_API_BASE_URL || ''
  const es = new EventSource(`${baseURL}/api/v1/gomoku/${gameId}/events?token=${token}`)

  es.onmessage = (event) => {
    if (!event.data) return
    try {
      onEvent(JSON.parse(event.data))
    } catch {
      // 忽略格式错误的推送
    }
  }

  es.onerror = () => {
    // EventSource 内置自动重连，无需手动处理
  }

  return es
}
