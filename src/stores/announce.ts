import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Announce } from '../api/announce'
import { fetchAnnounces as apiFetchAnnounces, createAnnounce as apiCreateAnnounce } from '../api/announce'

export const useAnnounceStore = defineStore('announce', () => {
  const list = ref<Announce[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasMore = computed(() => list.value.length < total.value)

  async function fetchAnnounces(page = 1) {
    loading.value = true
    error.value = null
    try {
      const res = await apiFetchAnnounces(page, pageSize.value)
      list.value = res.data
      total.value = res.total
      currentPage.value = page
    } catch {
      error.value = '公告加载失败'
    } finally {
      loading.value = false
    }
  }

  async function createAnnounce(title: string, content: string) {
    const result = await apiCreateAnnounce({ title, content })
    await fetchAnnounces(1)
    return result
  }

  return {
    list,
    total,
    currentPage,
    pageSize,
    loading,
    error,
    hasMore,
    fetchAnnounces,
    createAnnounce,
  }
})