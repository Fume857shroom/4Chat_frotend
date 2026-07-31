import { ref } from 'vue'
import router from '../router'

const unreadCount = ref(0)
const baseTitle = document.title || '4Chat'
const MERGE_WINDOW_MS = 3000
let lastNotifyAt = 0

// 授权：需用户手势触发，登录进入聊天页时调用一次
export function requestNotifyPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// 入口：SSE 收到其他用户消息时调用
export function notify(senderName: string, content: string) {
  // A：页面可见且窗口聚焦 → 静默（消息直接上屏，不打扰）
  if (!document.hidden && document.hasFocus()) {
    return
  }

  // 标题未读数累计（页面可见但失焦时同样累计，聚焦后自动清零）
  unreadCount.value++
  document.title = `（${unreadCount.value}）${baseTitle}`

  // 页面可见但窗口失焦（如被其他窗口遮挡）→ 只更新标题，不弹系统通知
  if (!document.hidden) {
    return
  }

  // C：页面完全隐藏（切走标签页/最小化）→ 系统通知
  const now = Date.now()
  const canNotify = 'Notification' in window && Notification.permission === 'granted'
  const merged = now - lastNotifyAt < MERGE_WINDOW_MS

  if (canNotify && !merged) {
    lastNotifyAt = now
    const notification = new Notification('4Chat', {
      body: `${senderName}：${truncate(content, 50)}`,
    })
    notification.onclick = () => {
      window.focus()
      resetUnread()
      if (router.currentRoute.value.name !== 'chat') {
        router.push({ name: 'chat' })
      }
    }
  }
}

// 回到页面/回到底部时清零未读并恢复标题
export function resetUnread() {
  if (unreadCount.value === 0) {
    return
  }
  unreadCount.value = 0
  document.title = baseTitle
}

export function useNotification() {
  return { unreadCount, notify, resetUnread }
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max)}…` : s
}