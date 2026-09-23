// ==========================================
// src/types/music.ts
// 「歌」板块共享类型：搜索曲目 / 播放地址 / 分享 / 月榜
// 接口返回结构随本文件走，api/music 与 stores/music、components/music 共用
// ==========================================

/**
 * 播放器能承载的最小曲目结构。
 * 搜索结果（MusicSearchItem）与分享/榜单条目都能映射成它，
 * 因此「点搜索结果播放」「点动态播放」「点榜单播放」走同一条路径。
 */
export interface PlayableTrack {
  /** QQ 音乐歌曲中串，播放取址与分享都以此为主键 */
  songmid: string
  title: string
  artist: string
  /** 时长（秒）；榜单不返回时长时为 0，实际时长以媒体元数据为准 */
  duration: number
  /** 封面直链（腾讯 CDN）；接口未返回时传空串，前端走确定性占位图 */
  coverUrl: string
}

/** GET /api/v1/music/search 的 data 单项 */
export interface MusicSearchItem extends PlayableTrack {
  album: string
  albumMid: string
  /** true 表示该曲目需 QQ 音乐侧账号/VIP 才能拿到播放地址 */
  needsLogin: boolean
}

/**
 * 播放地址来源（POST /api/v1/music/play 的 source）：
 * - 'upstream' 腾讯 CDN 直链，绝对地址、已签名，不需要 cookie / Authorization / Referer
 * - 'local'    预留给未来的服务器本地歌单，届时为本站相对路径
 */
export type MusicPlaySource = 'upstream' | 'local'

/**
 * 后端下发的一个可选播放源。同一首歌会有多档（高清 OGG + 标准 AAC），
 * 由播放器按 canPlayType 挑第一个能解码的 —— Safari/iOS 不支持 Vorbis。
 */
export interface MusicPlayCandidate {
  /** 容器名：ogg / m4a / mp3 / flac */
  format: string
  /** 音质标签，如「高清」「标准」 */
  quality: string
  /** canPlayType 的探测串 */
  mime: string
  url: string
}

/** POST /api/v1/music/play 的 data */
export interface MusicPlayInfo {
  /** 候选序列里的第一档（最高音质）；实际播放以 sources 择优选出的为准 */
  url: string
  quality: string
  fileSize: number
  /** 按音质从高到低 */
  sources: MusicPlayCandidate[]
  source: MusicPlaySource
}

/** POST /api/v1/music/share 的请求体（note 上限 200，与后端校验一致） */
export interface CreateShareDTO {
  songmid: string
  /** 1-5 */
  score: number
  note: string
}

/** PUT /api/v1/music/share 的请求体：一人一歌一条，重复评分就是改这条 */
export interface UpdateShareDTO {
  id: number
  /** 1-5 */
  score: number
  note: string
}

/** GET /api/v1/music/shares 的 data 单项（时间序动态流） */
export interface MusicShareItem {
  id: number
  songmid: string
  title: string
  artist: string
  duration: number
  /** 封面直链（后端由入库快照里的 album_mid 拼出，无需回源） */
  coverUrl: string
  /** 1-5 */
  score: number
  /** 后端未填留言时为 null */
  note: string | null
  /** 分享者用户 id */
  sharedBy: number
  /** 分享者展示名 */
  sharedName: string
  createdAt: string
}

/** 榜单行右侧留言条的单项（后端已排除请求者本人） */
export interface MusicChartNote {
  id: number
  sharedName: string
  score: number
  note: string
}

/** GET /api/v1/music/chart 的 data 单项（月度榜单） */
export interface MusicChartItem {
  rank: number
  songmid: string
  title: string
  artist: string
  duration: number
  coverUrl: string
  /** 平均分（浮点，展示时保留 1 位） */
  avgScore: number
  shareCount: number
  /** 当月别人最近的几条留言，最多 3 条 */
  notes: MusicChartNote[]
}

/** GET /api/v1/music/chart/detail 的 data */
export interface MusicSongDetail {
  song: PlayableTrack
  stats: {
    /** 与榜单同一个贝叶斯口径 */
    avgScore: number
    shareCount: number
    /** 下标 0..4 依次为 1~5 星的人数 */
    distribution: number[]
  };
  /** 当月该歌全部评论，分数降序 */
  list: MusicShareItem[]
  /** 我对这首歌的评分记录，不受查看月份过滤；没评过为 null */
  mine: MusicShareItem | null
}
