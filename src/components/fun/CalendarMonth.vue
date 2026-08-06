<script setup lang="ts">
import { ref, computed } from 'vue'
import { Lunar } from 'lunar-javascript'

const props = defineProps<{
  selectedDate: Date
}>()

const emit = defineEmits<{
  'update:selectedDate': [date: Date]
}>()

// 视图年月
const viewYear = ref(props.selectedDate.getFullYear())
const viewMonth = ref(props.selectedDate.getMonth() + 1)

function prevMonth() {
  if (viewMonth.value === 1) {
    viewYear.value--
    viewMonth.value = 12
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 12) {
    viewYear.value++
    viewMonth.value = 1
  } else {
    viewMonth.value++
  }
}

// 星期行
const weekdays = ['一', '二', '三', '四', '五', '六', '日']

// 日期网格
interface DayCell {
  day: number
  isOtherMonth: boolean
  isToday: boolean
  isSelected: boolean
  lunarDay: string
  jieQi: string
  date: Date
}

function dateStr(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const todayStr = dateStr(new Date())

const grid = computed(() => {
  const cells: DayCell[] = []
  const year = viewYear.value
  const month = viewMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = (firstDay.getDay() + 6) % 7
  const selStr = dateStr(props.selectedDate)

  // 上月补位
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const date = new Date(year, month - 2, d)
    const lunar = Lunar.fromDate(date)
    cells.push({
      day: d,
      isOtherMonth: true,
      isToday: false,
      isSelected: false,
      lunarDay: lunar.getDayInChinese(),
      jieQi: lunar.getJieQi() || '',
      date,
    })
  }

  // 本月
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const lunar = Lunar.fromDate(date)
    const ds = dateStr(date)
    cells.push({
      day: d,
      isOtherMonth: false,
      isToday: ds === todayStr,
      isSelected: ds === selStr,
      lunarDay: lunar.getDayInChinese(),
      jieQi: lunar.getJieQi() || '',
      date,
    })
  }

  // 下月补位（填满最后一行）
  const remaining = 7 - (cells.length % 7 || 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month, d)
      const lunar = Lunar.fromDate(date)
      cells.push({
        day: d,
        isOtherMonth: true,
        isToday: false,
        isSelected: false,
        lunarDay: lunar.getDayInChinese(),
        jieQi: lunar.getJieQi() || '',
        date,
      })
    }
  }

  return cells
})

function selectDay(cell: DayCell) {
  emit('update:selectedDate', cell.date)
}

// 翻月后选中当月1号（不联动黄历，只切换视图）
function goPrevMonth() {
  prevMonth()
}

function goNextMonth() {
  nextMonth()
}

// 回到今天
function goToday() {
  const today = new Date()
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth() + 1
  emit('update:selectedDate', today)
}

// 已选中日期格式化
const selectedLabel = computed(() => {
  const d = props.selectedDate
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
</script>

<template>
  <section class="cal-card">
    <!-- 头部：年月 + 翻月 -->
    <div class="cal-head">
      <span class="cal-head__title">{{ viewYear }}年{{ viewMonth }}月</span>
      <div class="cal-head__nav">
        <button class="cal-head__btn" @click="goPrevMonth">‹</button>
        <button class="cal-head__btn" @click="goNextMonth">›</button>
      </div>
    </div>

    <!-- 星期行 -->
    <div class="cal-week">
      <span
        v-for="(wd, i) in weekdays"
        :key="wd"
        :class="{ 'cal-week__end': i >= 5 }"
      >{{ wd }}</span>
    </div>

    <!-- 日期网格 -->
    <div class="cal-grid">
      <button
        v-for="(cell, i) in grid"
        :key="i"
        :class="{
          'cal-cell': true,
          'cal-cell--other': cell.isOtherMonth,
          'cal-cell--today': cell.isToday,
          'cal-cell--selected': cell.isSelected,
          'cal-cell--weekend': i % 7 >= 5 && !cell.isOtherMonth,
        }"
        @click="selectDay(cell)"
      >
        <span class="cal-cell__day">{{ cell.day }}</span>
        <span class="cal-cell__lunar">{{ cell.jieQi || cell.lunarDay }}</span>
      </button>
    </div>

    <!-- 底部 -->
    <div class="cal-foot">
      <button class="cal-foot__today" @click="goToday">回到今天</button>
      <span class="cal-foot__picked">已选中 {{ selectedLabel }}</span>
    </div>
  </section>
</template>

<style scoped>
.cal-card {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(0, 240, 255, 0.04), transparent 40%),
    var(--panel-strong);
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.cal-head__title {
  font-size: 15px;
  font-weight: 600;
}

.cal-head__nav {
  display: flex;
  gap: 6px;
}

.cal-head__btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font-size: 15px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: border-color 0.2s;
}

.cal-head__btn:hover {
  border-color: var(--cyan);
}

.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}

.cal-week span {
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  padding: 4px 0;
}

.cal-week__end {
  color: var(--pink) !important;
  opacity: 0.65;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 38px;
  gap: 3px;
  flex: 1;
  min-height: 0;
  align-content: start;
}

.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  width: 36px;
  height: 38px;
  justify-self: center;
  padding: 0;
}

.cal-cell:hover {
  background: rgba(255, 255, 255, 0.06);
}

.cal-cell--other {
  color: var(--muted);
  opacity: 0.35;
}

.cal-cell--weekend {
  color: var(--pink);
  opacity: 0.7;
}

.cal-cell--today {
  border-color: var(--cyan);
}

.cal-cell--selected {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.08));
  border-color: var(--cyan);
  font-weight: 600;
}

.cal-cell__day {
  font-size: 13px;
  line-height: 1.2;
}

.cal-cell__lunar {
  font-size: 9px;
  opacity: 0.7;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal-cell--selected .cal-cell__lunar {
  opacity: 0.85;
}

.cal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.cal-foot__today {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font-size: 12px;
  padding: 5px 14px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.cal-foot__today:hover {
  border-color: var(--cyan);
}

.cal-foot__picked {
  font-size: 12px;
  color: var(--muted);
}
</style>