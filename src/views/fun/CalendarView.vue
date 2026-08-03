<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCalendar, type DailyCalendar } from '../../api/calendar'
import CalendarMonth from '../../components/fun/CalendarMonth.vue'
import HuangliPanel from '../../components/fun/HuangliPanel.vue'

const selectedDate = ref(new Date())
const calendarData = ref<DailyCalendar | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let lastDateStr = ''

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchCalendar(date: Date) {
  const dateStr = formatDate(date)
  if (dateStr === lastDateStr) return
  lastDateStr = dateStr
  loading.value = true
  error.value = null
  try {
    const res = await getCalendar(dateStr)
    if (res.data.code === 0) {
      calendarData.value = res.data.data
    } else {
      error.value = `请求失败: ${res.data.message}`
    }
  } catch {
    error.value = '网络异常，请重试'
  } finally {
    loading.value = false
  }
}

function onDateSelected(date: Date) {
  selectedDate.value = date
  fetchCalendar(date)
}

function onRetry() {
  fetchCalendar(selectedDate.value)
}

onMounted(() => {
  fetchCalendar(selectedDate.value)
})
</script>

<template>
  <div class="calendar-layout">
    <HuangliPanel
      :data="calendarData"
      :loading="loading"
      :error="error"
      :selectedDate="formatDate(selectedDate)"
      @retry="onRetry"
    />
    <CalendarMonth
      :selectedDate="selectedDate"
      @update:selectedDate="onDateSelected"
    />
  </div>
</template>

<style scoped>
.calendar-layout {
  display: flex;
  gap: 24px;
  height: 100%;
  min-height: 0;
}

/* 黄历 40% / 日历 60% */
.calendar-layout > :first-child {
  flex: 0 0 40%;
  min-width: 0;
}

.calendar-layout > :last-child {
  flex: 1 1 60%;
  min-width: 0;
}
</style>