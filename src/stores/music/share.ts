// ==========================================
// src/stores/music/share.ts
// 分享排行状态：动态流（分页）+ 月榜 + 单曲详情 + 提交/修改评分
// 搜索结果不进 store —— 只在「音乐播放」页内使用，属页面局部状态
// ==========================================
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  CreateShareDTO,
  MusicChartItem,
  MusicShareItem,
  MusicSongDetail,
  UpdateShareDTO,
} from '../../types/music'
import {
  createShare as apiCreateShare,
  fetchChart as apiFetchChart,
  fetchShares as apiFetchShares,
  fetchSongDetail as apiFetchSongDetail,
  updateShare as apiUpdateShare,
} from '../../api/music'

const FEED_LIMIT = 20

// 本地时区的 YYYY-MM（榜单按月统计，不能用 toISOString：UTC 会跨月）
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function currentMonth(): string {
  return monthKey(new Date())
}

/**
 * 我对这首歌的评分状态：
 * - new              没评过 → 可「评分并推荐」
 * - mineThisMonth    本月评过 → 可「修改评分」（改分改留言都算重新计入本月榜单）
 * - mineOtherMonth   往月评过 → 一人一歌只有一条，那条不在本月，既不能在本月再评一次，
 *                    改它也不会进本月榜（created_at 不变），所以只提供看和听
 */
type RatingState = 'new' | 'mineThisMonth' | 'mineOtherMonth'

export const useShareStore = defineStore('music-share', () => {
  // --- 动态流 ---
  const list = ref<MusicShareItem[]>([])
  const total = ref(0)
  const page = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)

  const hasMore = computed(() => list.value.length < total.value)

  // --- 月榜 ---
  const chart = ref<MusicChartItem[]>([])
  const chartMonth = ref(currentMonth())
  const chartLoading = ref(false)
  const chartError = ref<string | null>(null)

  async function fetchFeed(target = 1) {
    loading.value = true
    error.value = null

    try {
      const res = await apiFetchShares(target, FEED_LIMIT)
      list.value = res.list
      total.value = res.total
      page.value = res.page
    } catch {
      error.value = '分享动态加载失败'
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) {
      return
    }

    loadingMore.value = true
    error.value = null

    try {
      const res = await apiFetchShares(page.value + 1, FEED_LIMIT)
      list.value = [...list.value, ...res.list]
      total.value = res.total
      page.value = res.page
    } catch {
      error.value = '分享动态加载失败'
    } finally {
      loadingMore.value = false
    }
  }

  async function fetchChart() {
    chartLoading.value = true
    chartError.value = null

    try {
      chart.value = await apiFetchChart(chartMonth.value)
    } catch {
      chartError.value = '月度排行加载失败'
    } finally {
      chartLoading.value = false
    }
  }

  function setChartMonth(month: string) {
    chartMonth.value = month
    // 详情跟着月份走：换月等于换一份评分口径，留着旧详情会显示上个月的留言
    if (detailSongmid.value) {
      void openDetail(detailSongmid.value)
    }
    return fetchChart()
  }

  // --- 单曲详情 ---
  const detail = ref<MusicSongDetail | null>(null)
  const detailSongmid = ref('')
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)

  const ratingState = computed<RatingState>(() => {
    const mine = detail.value?.mine
    if (!mine) {
      return 'new'
    }
    return monthKey(new Date(mine.createdAt)) === chartMonth.value ? 'mineThisMonth' : 'mineOtherMonth'
  })

  /** 打开某首歌的详情（榜单行点击入口）*/
  async function openDetail(songmid: string) {
    detailSongmid.value = songmid
    detailLoading.value = true
    detailError.value = null

    try {
      detail.value = await apiFetchSongDetail(songmid, chartMonth.value)
    } catch (e: unknown) {
      detail.value = null
      // 后端这条的中文 message 就是「这首歌还没有人分享」，原样透出比写死一句更准
      detailError.value = e instanceof Error ? e.message : '这首歌的评分加载失败'
    } finally {
      detailLoading.value = false
    }
  }

  function closeDetail() {
    detail.value = null
    detailSongmid.value = ''
    detailError.value = null
  }

  /**
   * 提交评分：带 id 走修改，否则新建。
   * 三个视图都要跟着刷新 —— 时间流（留言正文）、榜单（分数与留言条）、详情（分布与 mine）
   */
  async function submitRating(dto: CreateShareDTO | UpdateShareDTO): Promise<MusicShareItem> {
    const saved = 'id' in dto ? await apiUpdateShare(dto) : await apiCreateShare(dto)

    const tasks: Promise<unknown>[] = [fetchFeed(1), fetchChart()]
    if (detailSongmid.value) {
      tasks.push(openDetail(detailSongmid.value))
    }
    await Promise.all(tasks)

    return saved
  }

  return {
    // state
    list,
    total,
    page,
    loading,
    loadingMore,
    error,
    hasMore,
    chart,
    chartMonth,
    chartLoading,
    chartError,
    detail,
    detailSongmid,
    detailLoading,
    detailError,
    ratingState,
    // actions
    fetchFeed,
    loadMore,
    fetchChart,
    setChartMonth,
    openDetail,
    closeDetail,
    submitRating,
  }
})
