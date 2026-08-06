import http from '../http'
import type { Envelope } from '../http'

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

export async function createGame(): Promise<Game> {
  const res = await http.post<Envelope<Game>>('/api/v1/gomoku/new')
  return res.data.data!
}

export async function joinGame(gameId: number): Promise<Game> {
  const res = await http.post<Envelope<Game>>(`/api/v1/gomoku/join/${gameId}`)
  return res.data.data!
}

export async function makeMove(
  gameId: number,
  payload: MovePayload,
): Promise<Game> {
  const res = await http.post<Envelope<Game>>(`/api/v1/gomoku/move/${gameId}`, payload)
  return res.data.data!
}

export async function getGame(gameId: number): Promise<Game> {
  const res = await http.get<Envelope<Game>>(`/api/v1/gomoku/${gameId}`)
  return res.data.data!
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
export async function getCurrent(): Promise<Game | null> {
  const res = await http.get<Envelope<Game | null>>('/api/v1/gomoku/current')
  return res.data.data ?? null
}

// 重新开始：投票制（第一票记录 restartVotes，第二票真正重开），败者执黑
export async function restartGame(): Promise<Game> {
  const res = await http.post<Envelope<Game>>('/api/v1/gomoku/restart')
  return res.data.data!
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
