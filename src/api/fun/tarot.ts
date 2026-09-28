import http from '../http'

// ==========================================================
// 塔罗接口层。
// 普通请求走 http（axios）；两个流式端点必须用 fetch——axios 拿不到
// 增量响应体。api/chat/online.ts 已有在 api/ 内直接用 fetch 的先例。
// ==========================================================

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

/* ---------- 类型（与后端 tarot.row.ts 的出参结构逐字对应） ---------- */

export interface TarotCardOut {
  cardId: number
  cardName: string
  /** 形如 /tarot/13.webp，逆位由前端 CSS 旋转 */
  pic: string
  reversed: boolean
  positionLabel: string
  meaning: string
}

export interface TarotSlot extends TarotCardOut {
  index: number
  slotName: string
}

export interface TarotAsk {
  id: number
  question: string
  answer: string
  createdAt: string
}

export interface TarotDaily {
  drawDate: string
  card: TarotCardOut
  /** 内置库解读，无提问时的主内容 */
  reading: string
  askUsed: number
  askLimit: number
  asks: TarotAsk[]
}

export interface TarotSpreadResult {
  id: number
  spreadKey: string
  spreadName: string
  setIndex: number
  slots: TarotSlot[]
  /** AI 综合解读；降级时为 null */
  reading: string | null
  /** 'ai' | 'cards_only' */
  source: string
  createdAt: string
}

export interface TarotCardIndex {
  id: number
  nameCn: string
  nameEn: string
  pic: string
}

export interface TarotCardDetail extends TarotCardIndex {
  meaningUp: string
  meaningDown: string
  readingUp: string
  readingDown: string
  lore: string[]
}

export interface TarotSpreadMeta {
  key: string
  name: string
  cardsNum: number
  isCut: boolean
  representations: string[][]
}

interface Envelope<T> {
  code: number
  message: string
  data?: T
}

/* ---------- 普通请求 ---------- */

export function getCards() {
  return http.get<Envelope<TarotCardIndex[]>>('/api/v1/tarot/cards')
}

export function getCardDetail(id: number) {
  return http.get<Envelope<TarotCardDetail>>(`/api/v1/tarot/cards/${id}`)
}

export function getSpreads() {
  return http.get<Envelope<TarotSpreadMeta[]>>('/api/v1/tarot/spreads')
}

export function getDaily() {
  return http.get<Envelope<TarotDaily | null>>('/api/v1/tarot/daily')
}

export function drawDaily() {
  return http.post<Envelope<TarotDaily>>('/api/v1/tarot/daily/draw')
}

export function getHistory(type: 'daily' | 'spread', cursor?: number, limit = 20) {
  return http.get<Envelope<(TarotDaily | TarotSpreadResult)[]>>('/api/v1/tarot/history', {
    params: { type, limit, ...(cursor ? { cursor } : {}) },
  })
}

/* ---------- SSE 流式 ---------- */

/** 后端下发的流事件，type 决定其余字段 */
export type TarotStreamEvent =
  | { type: 'start'; askUsed: number }
  | { type: 'cards'; spread: TarotSpreadResult }
  | { type: 'delta'; text: string }
  | {
      type: 'done'
      spread?: TarotSpreadResult
      ask?: TarotAsk
      askUsed?: number
      /** true = 命中安全关键词短路，answer 是固定转介话术 */
      blocked?: boolean
      answer?: string
    }
  | { type: 'error'; code: number; message: string }

/**
 * 错误对象刻意带上 response.data.message：
 * composables/errorText.ts 靠这个字段判断"是不是后端给的中文提示"，
 * 形状不对就会回落到调用方的兜底文案，把后端真正的原因吞掉。
 */
function httpLikeError(message: string, body: unknown): Error {
  return Object.assign(new Error(message), { response: { data: body } })
}

async function consumeSse(
  path: string,
  body: unknown,
  onEvent: (evt: TarotStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('token')
  const res = await fetch(baseURL + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
    signal,
  })

  const ct = res.headers.get('content-type') || ''

  // 非 SSE 有两种情况，必须分开处理：
  // 1) 安全短路：HTTP 200 + code 0 + data.blocked，这是正常结果，转成一个 done 事件
  //    （危机转介话术不该被当成报错弹给用户）
  // 2) 预检失败：409 没抽牌 / 403 额度用完 / 404 牌阵不存在 / 429 限流，
  //    后端在开流之前返回普通 JSON 信封，转成 errorText 能识别的形状
  if (!ct.includes('text/event-stream')) {
    const data = (await res.json().catch(() => null)) as Envelope<Record<string, unknown>> | null
    if (res.ok && data?.code === 0 && data.data?.blocked === true) {
      onEvent({
        type: 'done',
        blocked: true,
        answer: String(data.data.answer ?? ''),
        askUsed: Number(data.data.askUsed ?? 0),
      })
      return
    }
    throw httpLikeError(data?.message || `请求失败（HTTP ${res.status}）`, data)
  }

  if (!res.body) throw httpLikeError('流式响应为空', null)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  // 一个 SSE 事件可能被拆到两个 chunk，必须跨 chunk 缓冲后按行切
  let buf = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const payload = t.slice(5).trim()
        if (!payload) continue
        let evt: TarotStreamEvent
        try {
          evt = JSON.parse(payload) as TarotStreamEvent
        } catch {
          continue
        }
        onEvent(evt)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** POST /daily/ask — 对今日牌提问（流式） */
export function askDaily(
  question: string,
  onEvent: (evt: TarotStreamEvent) => void,
  signal?: AbortSignal,
) {
  return consumeSse('/api/v1/tarot/daily/ask', { question }, onEvent, signal)
}

/** POST /spreads/:key/draw — 抽牌阵（流式；cards 事件先于 delta 到达） */
export function drawSpread(
  key: string,
  onEvent: (evt: TarotStreamEvent) => void,
  signal?: AbortSignal,
) {
  return consumeSse(`/api/v1/tarot/spreads/${encodeURIComponent(key)}/draw`, {}, onEvent, signal)
}
