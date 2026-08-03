import { ref } from 'vue'
import router from '../router'

const unreadCount = ref(0)
const baseTitle = document.title || '4Chat'
const MERGE_WINDOW_MS = 3000
let lastNotifyAt = 0

export type NotifyPermissionStatus = 'granted' | 'denied' | 'unsupported' | 'requested'

// 系统通知能力检测：非安全上下文（HTTP）下浏览器禁用 Notification，需先降级
function canUseSystemNotification(): boolean {
  if (!window.isSecureContext) {
    return false
  }
  return 'Notification' in window
}

// 授权：需用户手势触发，登录进入聊天页时调用一次；返回状态供页面提示
export function requestNotifyPermission(): NotifyPermissionStatus {
  if (!canUseSystemNotification()) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  if (Notification.permission === 'denied') {
    return 'denied'
  }
  // default：发起授权请求，兼容旧式 callback 形式并吞掉可能的 rejection
  try {
    const req = Notification.requestPermission() as unknown as
      | Promise<NotificationPermission>
      | undefined
    req?.catch?.(() => {})
  } catch {
    return 'unsupported'
  }
  return 'requested'
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
  const canNotify = canUseSystemNotification() && Notification.permission === 'granted'
  const merged = now - lastNotifyAt < MERGE_WINDOW_MS

  if (canNotify && !merged) {
    lastNotifyAt = now
    try {
      const notification = new Notification('4Chat', {
        body: `${senderName}：${truncate(content, 50)}`,
        tag: '4chat-message', // 同 tag 通知由浏览器自动合并，双重防轰炸
      })
      notification.onclick = () => {
        window.focus()
        resetUnread()
        if (router.currentRoute.value.name !== 'chat') {
          router.push({ name: 'chat' })
        }
        notification.close()
      }
    } catch {
      // 构造失败（权限被系统撤销等）→ 静默降级，仅保留标题未读
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
