import http from '../http'

export interface DailyCalendar {
  solarDate: string
  lunarDate: string
  ganZhi: string
  yi: string[]
  ji: string[]
  chong: string
  shen: string
  jieQi: string | null
  pengZu: string
}

export function getCalendar(date?: string) {
  return http.get<{ code: number; message: string; data: DailyCalendar }>('/api/v1/calendar', {
    params: date ? { date } : {},
  })
}