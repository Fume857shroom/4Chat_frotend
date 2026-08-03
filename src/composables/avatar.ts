// ==========================================
// 头像工具：URL 解析与占位符配色
// ==========================================

// /uploads/... 相对路径 → 拼接 API 域名；空值返回 ''（表示无头像）
export function resolveAvatarUrl(avatar?: string): string {
  if (!avatar) {
    return ''
  }
  if (/^https?:\/\//.test(avatar)) {
    return avatar
  }
  return `${import.meta.env.VITE_API_BASE_URL || ''}${avatar}`
}

// 按 userId 哈希生成稳定色相，占位符背景色同一用户恒定
export function avatarHue(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash % 360
}
