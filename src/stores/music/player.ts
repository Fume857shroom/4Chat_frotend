// ==========================================
// src/stores/music/player.ts
// 播放器状态（队列 / 循环 / 自动下一首 + 全站小播放器界面状态）
// 跨「音乐播放」「分享排行」「我的收藏」与挂在 HomeView 的小播放器共享，故进 store。
//
// 三个关键约定：
// 1. 音频直连腾讯 CDN：地址由 POST /music/play 下发，直接赋给 <audio>.src，
//    不经 axios、不建 objectURL，避免把所有听众的流量压到本站出口。
// 2. 地址有时效：每次「开始播放」（首播 / 暂停后续播 / 出错重试 / 暂停中拖动）
//    都重新取址，取址逻辑只在下面的 acquireUrl 一处，视图层不感知 upstream / local 差异。
// 3. 签名地址一律不落 localStorage：只存队列曲目（songmid/title/artist/duration/coverUrl）、
//    队列下标、循环/随机、小播放器位置与展开/关闭。刷新后队列能恢复显示，
//    但绝不自动开播（浏览器策略不允许无手势播放，也不去绕）。
// ==========================================
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchPlayInfo, fetchShares } from '../../api/music'
import type { MusicPlayCandidate, MusicPlayInfo, PlayableTrack } from '../../types/music'
import { fileUrlOf } from '../../composables/file'
import { showToast } from '../../composables/toast'

/** 循环模式：off 顺序播完停住 / all 列表循环 / one 单曲循环 */
export type PlayMode = 'off' | 'all' | 'one'
/** 队列是从哪儿攒起来的，只用于展示来源文案 */
export type QueueSourceKind = '' | 'shares' | 'chart' | 'favorites' | 'playlist'

const QUEUE_KEY = 'music_player_queue'
const MINI_KEY = 'music_player_mini'
/** 连续几首都取不到地址就停下：不挡的话上游抽风时会把整个队列的请求刷完 */
const FAIL_LIMIT = 3
/** 已播超过这个秒数再点「上一首」＝重新起播当前这首，而不是退回上一首 */
const PREV_RESTART_AT = 3
/** 循环按钮的切换顺序，与文案 列表循环 → 单曲循环 → 顺序播放 一致 */
const REPEAT_ORDER: PlayMode[] = ['all', 'one', 'off']

/** 循环按钮的文案与角标，小播放器与右栏面板共用一份 */
export const REPEAT_LABEL: Record<PlayMode, string> = {
  all: '列表循环',
  one: '单曲循环',
  off: '顺序播放',
}
export const REPEAT_ICON: Record<PlayMode, string> = {
  all: '🔁',
  one: '🔂',
  off: '▶',
}

interface Point {
  x: number
  y: number
}

interface PersistedQueue {
  queue?: unknown
  queueIndex?: unknown
  source?: unknown
  sourceName?: unknown
  repeat?: unknown
  shuffle?: unknown
}

interface PersistedMini {
  x?: unknown
  y?: unknown
  expanded?: unknown
  dismissed?: unknown
  volume?: unknown
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1
  }

  return Math.min(Math.max(index, 0), length - 1)
}

function isTrack(value: unknown): value is PlayableTrack {
  const item = value as PlayableTrack | null
  return !!item && typeof item.songmid === 'string' && typeof item.title === 'string'
}

/** Fisher-Yates 洗牌出来的下标序列：整队列各播一次，天然不会连续重复同一首 */
function makeShuffleOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i)

  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = order[i]!
    order[i] = order[j]!
    order[j] = swap
  }

  return order
}

export const usePlayerStore = defineStore('music-player', () => {
  // --- State ---
  const track = ref<PlayableTrack | null>(null)
  /** 当前生效的播放地址（与 track 并存，仅便于排查/展示） */
  const playUrl = ref('')
  /** 后端下发的音质标签，如 320kbps */
  const quality = ref('')
  const isPlaying = ref(false)
  /** 取址中（点歌后到真正出声之间的空档） */
  const isLoading = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const error = ref<string | null>(null)
  const volume = ref(1)

  // --- State：队列（刷新时从 localStorage 恢复，只恢复列表不恢复声音） ---
  const savedQueue = readJson<PersistedQueue>(QUEUE_KEY)
  const queue = ref<PlayableTrack[]>(toTracks(savedQueue?.queue))
  /**
   * 队列指针。允许是 -1，含义是「还没落进队列里」：
   * 刷新后（没有自动开播）、以及把正在播的那首移出队列之后。
   */
  const queueIndex = ref(
    queue.value.length ? clampIndex(Number(savedQueue?.queueIndex) || 0, queue.value.length) : -1,
  )
  const queueSource = ref<QueueSourceKind>(pickSource(savedQueue?.source))
  /** 来源是歌单时的歌单名，只用于「来自歌单「xx」」这句文案 */
  const queueSourceName = ref(
    typeof savedQueue?.sourceName === 'string' ? savedQueue.sourceName : '',
  )
  const repeat = ref<PlayMode>(pickMode(savedQueue?.repeat))
  const shuffle = ref(savedQueue?.shuffle === true)
  /** 当前曲目是不是队列外单点的一首（语义见 playTrack 的注释） */
  const offQueue = ref(true)
  /** 随机序列在设队列时生成一次存起来，切歌只在这张表上走位 */
  const shuffleOrder = ref<number[]>(makeShuffleOrder(queue.value.length))

  // --- State：小播放器界面（位置 null = 还没拖过，用默认右下角） ---
  const savedMini = readJson<PersistedMini>(MINI_KEY)
  const miniPos = ref<Point | null>(readPoint(savedMini))
  const miniExpanded = ref(savedMini?.expanded === true)
  const miniDismissed = ref(savedMini?.dismissed === true)

  const hasTrack = computed(() => track.value !== null)
  /**
   * 界面该展示哪一首：正在播 / 暂停中的优先，
   * 其次是刷新后从队列里恢复出来的待播那一首（此时还没有 track）
   */
  const displayTrack = computed<PlayableTrack | null>(
    () => track.value ?? queue.value[clampIndex(queueIndex.value, queue.value.length)] ?? null,
  )
  /** 小播放器要不要出现：关过就没有，直到下一次新的播放动作；没歌也没队列时同样不出现 */
  const miniVisible = computed(() => !miniDismissed.value && displayTrack.value !== null)
  const queueLength = computed(() => queue.value.length)
  const queueSourceText = computed(() => {
    switch (queueSource.value) {
      case 'shares':
        return '来自最新分享'
      case 'chart':
        return '来自月度排行'
      case 'favorites':
        return '来自我的收藏'
      case 'playlist':
        return `来自歌单「${queueSourceName.value || '未命名'}」`
      default:
        return ''
    }
  })
  const repeatLabel = computed(() => REPEAT_LABEL[repeat.value])
  const repeatIcon = computed(() => REPEAT_ICON[repeat.value])

  // 媒体元素是脱离 DOM 的单例：切子页、切栏目都不会中断播放，
  // 首次点击播放时惰性创建（iOS 要求媒体在用户手势中解锁）
  let audio: HTMLAudioElement | null = null
  // 新地址元数据加载完成后要跳转到的进度（续播 / 暂停中拖动）
  let pendingSeek: number | null = null
  // 起播序号：取址是异步的，用户连点两首时后到的那次结果要丢掉
  let playToken = 0
  // 连挂计数：成功起播（play 事件）就归零
  let failStreak = 0
  // 自动切歌的重入闸：同一时间只允许一次推进（失败连切与播完连切共用）
  let advancing = false

  function ensureAudio(): HTMLAudioElement {
    if (audio) {
      return audio
    }

    const el = new Audio()
    // 不设 crossorigin：CDN 直链按普通媒体元素播放即可，加了反而会触发 CORS 校验
    el.preload = 'auto'
    el.volume = volume.value

    el.addEventListener('play', () => {
      isPlaying.value = true
      error.value = null
      // 响到就算数：抹掉连挂计数，后面的歌重新有整段的容错额度
      failStreak = 0
    })
    el.addEventListener('pause', () => {
      isPlaying.value = false
      // 暂停时的精确位置：timeupdate 粒度约 250ms，续播/拖动都以这里为准
      if (pendingSeek === null) {
        currentTime.value = el.currentTime
      }
    })
    el.addEventListener('timeupdate', () => {
      // 换址后等待跳转期间不回写：新地址加载过程中会先报到 0，避免进度闪回起点
      if (pendingSeek !== null) {
        return
      }
      currentTime.value = el.currentTime
    })
    el.addEventListener('durationchange', () => {
      if (Number.isFinite(el.duration)) {
        duration.value = el.duration
      }
    })
    el.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        duration.value = el.duration
      }
      if (pendingSeek !== null) {
        const target = pendingSeek
        pendingSeek = null
        if (target > 0 && (!Number.isFinite(el.duration) || target < el.duration)) {
          el.currentTime = target
        }
      }
    })
    el.addEventListener('ended', () => {
      isPlaying.value = false
      currentTime.value = 0

      if (repeat.value === 'one') {
        // 单曲循环：重新取址从头播（上一轮的地址大概率已经过期）
        void replayCurrent()
        return
      }

      // 列表循环 / 顺序播放都交给 advance(1)：末尾该回 0 还是该停住由它判断
      void advance(1)
    })
    // 地址过期 / 网络中断都会走到这里：先自动切下一首，连挂到上限才停下来提示
    el.addEventListener('error', () => {
      isPlaying.value = false

      if (!track.value) {
        return
      }

      error.value = '播放失败，地址可能已过期，点播放可重试'
      void noteFailure()
    })

    audio = el
    return el
  }

  /** 同一首歌后端会下发多档，按浏览器实际解码能力挑第一个能放的 */
  function pickCandidate(info: MusicPlayInfo): MusicPlayCandidate | null {
    const el = ensureAudio()

    for (const candidate of info.sources) {
      // canPlayType 返回 '' 表示完全不支持；'maybe'/'probably' 都算可用
      if (!candidate.mime || el.canPlayType(candidate.mime) !== '') {
        return candidate
      }
    }

    return null
  }

  // --- 取址（唯一入口）---

  async function acquireUrl(songmid: string): Promise<string> {
    const info = await fetchPlayInfo(songmid)
    const candidate = info ? pickCandidate(info) : null

    if (!candidate?.url) {
      throw new Error('该歌曲暂无播放地址')
    }

    quality.value = candidate.quality || ''

    // 分支点：按候选自己声明的 source 判断，不看顶层 info.source ——
    // 顶层只是「首选源的来源」，同一首歌的多档里混着本地与上游是正常情况
    return candidate.source === 'local' ? fileUrlOf(candidate.url) : candidate.url
  }

  /** 重新取址并挂到媒体元素上；target 为元数据就绪后要恢复的进度 */
  async function loadSource(target = 0): Promise<boolean> {
    const songmid = track.value?.songmid

    if (!songmid) {
      return false
    }

    const el = ensureAudio()
    isLoading.value = true
    error.value = null

    try {
      const url = await acquireUrl(songmid)

      // 取址期间用户已切歌 / 已停止：丢弃这次结果
      if (track.value?.songmid !== songmid) {
        return false
      }

      pendingSeek = target > 0 ? target : null
      playUrl.value = url
      el.src = url
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '获取播放地址失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function startPlayback(): Promise<void> {
    const el = ensureAudio()

    try {
      await el.play()
    } catch (e: unknown) {
      // 连点会中断上一次 play()，属正常竞态，不提示
      if ((e as DOMException)?.name === 'AbortError') {
        return
      }
      error.value = '无法播放，请稍后重试'
      isPlaying.value = false
    }
  }

  // --- 队列走位 ---

  /**
   * 队列内前后挪一格，返回 -1 表示没有可播的目标（repeat='off' 且顶到了边界）。
   * 随机模式在 makeShuffleOrder 生成的那张表上走位：整轮各播一次，不会连续重复同一首。
   */
  function stepIndex(dir: 1 | -1): number {
    const length = queue.value.length

    if (!length) {
      return -1
    }

    // queueIndex 为 -1 ＝「还没落进队列」，往后一步正好是队列第一首
    const base = queueIndex.value

    if (shuffle.value && length > 1) {
      const order = shuffleOrder.value
      const at = order.indexOf(base)

      if (at < 0) {
        return dir > 0 ? (order[0] ?? -1) : -1
      }

      const nextAt = at + dir

      if (nextAt < 0 || nextAt >= length) {
        return repeat.value === 'all' ? (nextAt + length) % length : -1
      }

      return order[nextAt] ?? -1
    }

    const target = base + dir

    if (target < 0) {
      return repeat.value === 'all' ? length - 1 : -1
    }
    if (target >= length) {
      return repeat.value === 'all' ? 0 : -1
    }

    return target
  }

  /** 按队列下标起播 */
  async function playAt(index: number): Promise<boolean> {
    const item = queue.value[index]

    return item ? beginTrack(item, index) : false
  }

  /**
   * 起播一首歌的唯一出口。index 传 -1 表示「队列外单点」：
   * 队列与 queueIndex 一动不动，只换当前曲目。
   */
  async function beginTrack(item: PlayableTrack, index: number): Promise<boolean> {
    const token = ++playToken

    offQueue.value = index < 0

    if (index >= 0) {
      queueIndex.value = index
    } else if (!queue.value.length) {
      queueIndex.value = -1
    }

    // 任何一次新的播放动作，都把被 ✕ 掉的小播放器叫回来
    miniDismissed.value = false
    track.value = item
    currentTime.value = 0
    // 榜单/动态/队列快照可能不带时长，先占 0，等媒体元数据回填
    duration.value = item.duration

    if (!(await loadSource(0))) {
      // 取址期间已经被更新的播放动作抢走了：这次失败不再往下推进
      if (token === playToken) {
        await noteFailure()
      }
      return false
    }

    if (token !== playToken) {
      return false
    }

    await startPlayback()
    return true
  }

  /** 重新取址从头播当前这首（单曲循环用） */
  async function replayCurrent(): Promise<void> {
    const item = track.value

    if (item) {
      await beginTrack(item, offQueue.value ? -1 : queueIndex.value)
    }
  }

  /**
   * 一首没放成（取址失败或媒体报错都算）：连挂到 FAIL_LIMIT 就停下并提示，
   * 否则自动推进到下一首 —— 不挡的话上游抽风时会把整个队列的请求刷完。
   */
  async function noteFailure(): Promise<void> {
    failStreak += 1

    if (failStreak >= FAIL_LIMIT) {
      failStreak = 0
      const text = '多首歌曲取不到播放地址，已停止自动播放'
      error.value = text
      showToast(text, 4000)
      return
    }

    await advance(1)
  }

  /** 前后推进（dir=1 下一首 / -1 上一首）：手动切歌、播完连切、失败连切共用一条路 */
  async function advance(dir: 1 | -1): Promise<void> {
    if (advancing || !queue.value.length) {
      return
    }

    advancing = true

    try {
      const target = stepIndex(dir)

      if (target < 0) {
        // repeat='off' 且已到末尾：停住不循环，队列留着，用户还能手动点播放
        stopAtEnd()
        return
      }

      await playAt(target)
    } finally {
      advancing = false
    }
  }

  function stopAtEnd(): void {
    if (audio) {
      audio.pause()
    }

    isPlaying.value = false
    currentTime.value = 0
  }

  // --- Actions ---

  /**
   * 播放一首歌（列表里点一行的入口）。队列语义 —— 选定的一套规则，
   * 小播放器队列抽屉与右栏面板都按它显示，不覆盖用户正在听的队列：
   * 1. 点当前曲目 = 暂停 / 续播（与改造前一致）
   * 2. 点的这首就在队列里 = 队列跳位到它（不新建、不重复入队）
   * 3. 其余 = 队列外单点：队列与指针原封不动。听完它再点下一首会回到队列，
   *    并把被临时插听的那首算作已跳过（用户是听完才走的）；点上一首则先回到被中断那首。
   *
   * track 的语义仍然是「当前播放的曲目」＝ queue[queueIndex]，或者队列外单点的那一首。
   */
  async function playTrack(incoming: PlayableTrack): Promise<void> {
    if (track.value?.songmid === incoming.songmid) {
      await toggle()
      return
    }

    const inQueue = queue.value.findIndex((item) => item.songmid === incoming.songmid)

    if (inQueue >= 0) {
      await playAt(inQueue)
      return
    }

    await beginTrack(incoming, -1)
  }

  /** 设队列并从 startIndex 起播 */
  async function playQueue(
    tracks: PlayableTrack[],
    startIndex = 0,
    source: QueueSourceKind = '',
    sourceName = '',
  ): Promise<void> {
    if (!tracks.length) {
      return
    }

    setQueue(tracks, startIndex, source, sourceName)
    await playAt(queueIndex.value)
  }

  /**
   * 只换队列、不出声（刷新恢复与「换一批待播」用它）：
   * track 与声音都不动 —— 背着一段还在响的音频乱改指针最容易出怪事。
   */
  function setQueue(
    list: PlayableTrack[],
    index = 0,
    source: QueueSourceKind = '',
    sourceName = '',
  ): void {
    queue.value = toTracks(list)
    queueSource.value = source
    queueSourceName.value = sourceName
    shuffleOrder.value = makeShuffleOrder(queue.value.length)

    if (queue.value.length) {
      queueIndex.value = clampIndex(index, queue.value.length)
      offQueue.value = false
    } else {
      queueIndex.value = -1
    }
  }

  /** 移出队列。移的正是当前这首时声音不停，把它降级成队列外单曲 */
  function removeFromQueue(index: number): void {
    if (index < 0 || index >= queue.value.length) {
      return
    }

    const isCurrent = !offQueue.value && index === queueIndex.value

    queue.value.splice(index, 1)
    shuffleOrder.value = makeShuffleOrder(queue.value.length)

    if (!queue.value.length) {
      queueIndex.value = -1
      queueSource.value = ''
      queueSourceName.value = ''
      offQueue.value = true
      return
    }

    if (isCurrent) {
      // 指针退到前一位：下一首正好落在「顶上来」的那首上
      offQueue.value = true
      queueIndex.value = index - 1
    } else if (index < queueIndex.value) {
      queueIndex.value -= 1
    }
  }

  /** 清空队列。正在响的那首不硬摘，降级成队列外单曲，放完就停 */
  function clearQueue(): void {
    queue.value = []
    queueIndex.value = -1
    queueSource.value = ''
    queueSourceName.value = ''
    shuffleOrder.value = []
    offQueue.value = true
  }

  function pause(): void {
    ensureAudio().pause()
  }

  /** 下一首（手动点击与播完连切同一套语义：repeat='one' 只管播完，不挡手动前进） */
  async function next(): Promise<void> {
    await advance(1)
  }

  /** 上一首：播了几秒之后再点＝重播当前这首 */
  async function prev(): Promise<void> {
    if (!queue.value.length) {
      return
    }

    if (currentTime.value > PREV_RESTART_AT) {
      await seek(0)
      return
    }

    await advance(-1)
  }

  /** 循环模式切换，UI 按钮用：列表循环 → 单曲循环 → 顺序播放 */
  function cycleRepeat(): void {
    const at = REPEAT_ORDER.indexOf(repeat.value)

    repeat.value = REPEAT_ORDER[(at + 1) % REPEAT_ORDER.length] ?? 'all'
  }

  function toggleShuffle(): void {
    // 随机表在设队列时就生成好了，这里只切开关：切完下一首自然从表上取
    shuffle.value = !shuffle.value
  }

  /** 暂停后续播：必须重新取址（旧地址可能已过期），并恢复到原进度 */
  async function resume(): Promise<void> {
    if (!track.value || isLoading.value) {
      return
    }

    if (await loadSource(currentTime.value)) {
      await startPlayback()
    }
  }

  async function toggle(): Promise<void> {
    if (isPlaying.value) {
      pause()
      return
    }
    await resume()
  }

  /**
   * 队列为空时的兜底：拉「最新分享」当队列起播（来源文案「来自最新分享」）。
   * 同一首可能被不同人分享多次，按 songmid 去重后再入队。
   */
  async function playFromShares(): Promise<void> {
    try {
      const res = await fetchShares(1, 20)
      const seen = new Set<string>()
      const tracks: PlayableTrack[] = []

      for (const share of res.list) {
        if (seen.has(share.songmid)) {
          continue
        }

        seen.add(share.songmid)
        tracks.push({
          songmid: share.songmid,
          title: share.title,
          artist: share.artist,
          duration: share.duration,
          coverUrl: share.coverUrl,
        })
      }

      if (!tracks.length) {
        error.value = '最新分享里还没有可播的歌'
        return
      }

      await playQueue(tracks, 0, 'shares')
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '最新分享拉取失败'
    }
  }

  /**
   * 播放键的统一入口（小播放器与右栏面板共用，保证两边行为一致）：
   * 正在放 → 暂停；刷新后只有队列还没出声 → 从 queueIndex 那首起播；
   * 队列为空 → 用最新分享补一个队列；其余 → 暂停后续播（重新取址）。
   */
  async function togglePlayback(): Promise<void> {
    if (isPlaying.value) {
      pause()
      return
    }

    if (!track.value) {
      if (queue.value.length) {
        await playAt(clampIndex(queueIndex.value, queue.value.length))
      } else {
        await playFromShares()
      }
      return
    }

    if (!queue.value.length) {
      await playFromShares()
      return
    }

    await toggle()
  }

  /** 拖动进度条：播放中直接定位；暂停中地址可能已失效，重新取址后定位（不自动播放） */
  async function seek(time: number): Promise<void> {
    if (!track.value) {
      return
    }

    const el = ensureAudio()
    currentTime.value = time

    if (isPlaying.value) {
      el.currentTime = time
      return
    }

    // 正在取址（例如刚点播放）：这次的 pendingSeek 已在路上，不重复请求
    if (isLoading.value) {
      return
    }

    await loadSource(time)
  }

  /** 停止并收起：清空曲目与地址，媒体元素复位待用 */
  function setVolume(value: number): void {
    volume.value = Math.min(Math.max(value, 0), 1)
    ensureAudio().volume = volume.value
  }

  function stop(): void {
    // 让在路上取到的地址作废：回来也不再往下推进
    playToken += 1

    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }

    pendingSeek = null
    track.value = null
    playUrl.value = ''
    quality.value = ''
    isPlaying.value = false
    isLoading.value = false
    currentTime.value = 0
    duration.value = 0
    error.value = null
  }

  /** 小播放器拖动结束 / 窗口尺寸变化后写回位置（组件里已按视口 clamp 过） */
  function setMiniPos(pos: Point | null): void {
    miniPos.value = pos ? { x: Math.round(pos.x), y: Math.round(pos.y) } : null
  }

  function setMiniExpanded(expanded: boolean): void {
    miniExpanded.value = expanded
  }

  /** ✕ 关闭：停下声音并标记已关闭，直到下一次 playTrack / playQueue */
  function dismiss(): void {
    stop()
    miniDismissed.value = true
  }

  /** 从「歌 → 音乐播放」右栏的把手把小播放器重新叫回来 */
  function restoreMini(): void {
    miniDismissed.value = false
  }

  // 持久化：只存曲目快照与界面状态，签名地址一个字节都不落
  watch(
    [queue, queueIndex, queueSource, queueSourceName, repeat, shuffle],
    () => {
      writeJson(QUEUE_KEY, {
        queue: queue.value.map((item) => ({
          songmid: item.songmid,
          title: item.title,
          artist: item.artist,
          duration: item.duration,
          coverUrl: item.coverUrl,
        })),
        queueIndex: queueIndex.value,
        source: queueSource.value,
        sourceName: queueSourceName.value,
        repeat: repeat.value,
        shuffle: shuffle.value,
      })
    },
    { deep: true },
  )

  watch([miniPos, miniExpanded, miniDismissed, volume], () => {
    writeJson(MINI_KEY, {
      x: miniPos.value?.x ?? null,
      y: miniPos.value?.y ?? null,
      expanded: miniExpanded.value,
      dismissed: miniDismissed.value,
      volume: volume.value,
    })
  })

  return {
    // state
    track,
    playUrl,
    quality,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    error,
    volume,
    hasTrack,
    displayTrack,
    // 队列与循环
    queue,
    queueIndex,
    queueSource,
    queueSourceName,
    queueSourceText,
    queueLength,
    offQueue,
    repeat,
    repeatLabel,
    repeatIcon,
    shuffle,
    // 小播放器界面
    miniPos,
    miniExpanded,
    miniDismissed,
    miniVisible,
    // actions
    playTrack,
    playQueue,
    playAt,
    setQueue,
    removeFromQueue,
    clearQueue,
    next,
    prev,
    cycleRepeat,
    toggleShuffle,
    playFromShares,
    togglePlayback,
    pause,
    resume,
    toggle,
    seek,
    setVolume,
    stop,
    dismiss,
    restoreMini,
    setMiniPos,
    setMiniExpanded,
  }
})

// 存储读写：恢复这一处容错（用户手改 localStorage 是边界，坏了就当没存过）
function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 无痕模式下 setItem 会抛：存不上就算了，不该影响播放
  }
}

function toTracks(value: unknown): PlayableTrack[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isTrack).map((item) => ({
    songmid: item.songmid,
    title: item.title,
    artist: typeof item.artist === 'string' ? item.artist : '',
    duration: Number(item.duration) || 0,
    coverUrl: typeof item.coverUrl === 'string' ? item.coverUrl : '',
  }))
}

function pickSource(value: unknown): QueueSourceKind {
  return value === 'shares' || value === 'chart' || value === 'favorites' || value === 'playlist'
    ? value
    : ''
}

function pickMode(value: unknown): PlayMode {
  return value === 'off' || value === 'one' ? value : 'all'
}

function readPoint(saved: PersistedMini | null): Point | null {
  const x = Number(saved?.x)
  const y = Number(saved?.y)

  // 任一格缺失或不是数字都退回默认右下角（组件里会再按视口 clamp 一次）
  if (saved?.x == null || saved?.y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  return { x, y }
}
