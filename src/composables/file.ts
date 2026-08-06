// ==========================================
// 文件工具：URL 解析、图片判断、大小格式化、图标映射、下载
// 聊天页与媒体库共用
// ==========================================

export const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']

// /uploads/... 相对路径 → 拼接 API 域名；空值返回 ''
export function fileUrlOf(url?: string): string {
  if (!url) {
    return ''
  }
  if (/^https?:\/\//.test(url)) {
    return url
  }
  return `${import.meta.env.VITE_API_BASE_URL || ''}${url}`
}

// 扩展名是否属于图片类型（决定渲染缩略图还是文件卡片）
export function isImageExt(ext?: string): boolean {
  return IMAGE_EXTS.includes((ext || '').toLowerCase())
}

// 文件大小格式化：B / KB / MB / GB
export function formatFileSize(bytes: number): string {
  if (!bytes) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

// 按扩展名映射文件图标（与媒体库分组保持一致）
export function fileIconOf(ext?: string): string {
  const e = (ext || '').toLowerCase()
  if (IMAGE_EXTS.includes(e)) {
    return '🖼'
  }
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(e)) {
    return '🎬'
  }
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(e)) {
    return '🎵'
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) {
    return '📦'
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(e)) {
    return '📄'
  }
  return '📁'
}

// blob 下载：跨域资源 download 属性无效（浏览器安全策略），fetch 转 blob 后触发下载
// CORS 未放行时兜底新窗口打开；返回是否成功（供调用方 toast）
export async function downloadFile(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
    return true
  } catch {
    window.open(url, '_blank', 'noopener')
    return false
  }
}
