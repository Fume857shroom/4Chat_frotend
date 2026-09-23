// ==========================================
// src/stores/music/share.ts
// 分享排行状态：动态流（分页）+ 月榜 + 提交分享
// 搜索结果不进 store —— 只在「音乐播放」页内使用，属页面局部状态
// ==========================================
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CreateShareDTO, MusicChartItem, MusicShareItem } from '../../types/music'
import {
  createShare as apiCreateShare,
  fetchChart as apiFetchChart,
  fetchShares as apiFetchShares,
} from '../../api/music'

const FEED_LIMIT = 20

// 本地时区的 YYYY-MM（榜单按月统计，不能用 toISOString：UTC 会跨月）
function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

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
    return fetchChart()
  }

  /** 提交分享：成功后回到动态流第一页，并刷新当前月榜单 */
  async function submitShare(dto: CreateShareDTO): Promise<MusicShareItem> {
    const created = await apiCreateShare(dto)
    await Promise.all([fetchFeed(1), fetchChart()])
    return created
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
    // actions
    fetchFeed,
    loadMore,
    fetchChart,
    setChartMonth,
    submitShare,
  }
})
