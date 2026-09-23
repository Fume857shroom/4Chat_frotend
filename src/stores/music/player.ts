// ==========================================
// src/stores/music/player.ts
// 播放器状态（跨「音乐播放」「分享排行」两个子页共享，故进 store）
//
// 两个关键约定：
// 1. 音频直连腾讯 CDN：地址由 POST /music/play 下发，直接赋给 <audio>.src，
//    不经 axios、不建 objectURL，避免把所有听众的流量压到本站出口。
// 2. 地址有时效：每次「开始播放」（首播 / 暂停后续播 / 出错重试 / 暂停中拖动）
//    都重新取址，取址逻辑只在下面的 acquireUrl 一处，视图层不感知 upstream / local 差异。
// ==========================================
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchPlayInfo } from '../../api/music'
import type { MusicPlayCandidate, MusicPlayInfo, PlayableTrack } from '../../types/music'
import { fileUrlOf } from '../../composables/file'

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

  const hasTrack = computed(() => track.value !== null)

  // 媒体元素是脱离 DOM 的单例：切子页、切栏目都不会中断播放，
  // 首次点击播放时惰性创建（iOS 要求媒体在用户手势中解锁）
  let audio: HTMLAudioElement | null = null
  // 新地址元数据加载完成后要跳转到的进度（续播 / 暂停中拖动）
  let pendingSeek: number | null = null

  function ensureAudio(): HTMLAudioElement {
    if (audio) {
      return audio
    }

    const el = new Audio()
    // 不设 crossorigin：CDN 直链按普通媒体元素播放即可，加了反而会触发 CORS 校验
    el.preload = 'auto'

    el.addEventListener('play', () => {
      isPlaying.value = true
      error.value = null
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
      // 播完归零：下次点播放从头开始（重新取址逻辑不变）
      currentTime.value = 0
    })
    // 地址过期 / 网络中断都会走到这里：提示语保持中性，用户点播放即可重新取址
    el.addEventListener('error', () => {
      isPlaying.value = false
      if (track.value) {
        error.value = '播放失败，地址可能已过期，点播放可重试'
      }
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

    // 分支点：本地歌单走本站相对路径，上游直链原样使用
    return info.source === 'local' ? fileUrlOf(candidate.url) : candidate.url
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

  // --- Actions ---

  /** 播放一首歌：点击当前曲目的重复点击按「暂停/续播」处理 */
  async function playTrack(next: PlayableTrack): Promise<void> {
    if (track.value?.songmid === next.songmid) {
      await toggle()
      return
    }

    track.value = next
    currentTime.value = 0
    // 榜单/动态可能不带时长，先占 0，等媒体元数据回填
    duration.value = next.duration

    if (await loadSource(0)) {
      await startPlayback()
    }
  }

  function pause(): void {
    ensureAudio().pause()
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
  function stop(): void {
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
    hasTrack,
    // actions
    playTrack,
    pause,
    resume,
    toggle,
    seek,
    stop,
  }
})
