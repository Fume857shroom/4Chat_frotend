// ==========================================================
// 15 个牌阵的桌面端几何布局。
//
// 坐标是牌面中心点在舞台内的百分比（x 横向、y 纵向），牌宽按舞台宽度的百分比给。
// 舞台用固定宽高比，这样百分比坐标在任何屏幕尺寸下都保持同一形状。
//
// 窄屏不用这套坐标：TarotSpread.vue 在窄屏下按 slots 的 index 顺序
// 降级成竖向列表，牌够大能看清。所以这里不需要为手机单独定义一套。
//
// ⚠ 正统性说明（别把这份表当成塔罗教材）：
//   真传统、有公认排法的只有 6 个：holy_triangle / time_flow / four_elements /
//   five_cross / horseshoe / hexagram。
//   tree_of_life 借了卡巴拉树的形（传统用 10 张，这里只有 6 张）。
//   其余 7 个（peace_fan / saddio_star / soul_journey / starlight / moonpath /
//   dreamscape / wisdom_gate）在上游数据里就是原创命名，塔罗体系里查无此阵，
//   排法是按名字和位含义设计的，不是传统。
// ==========================================================

export interface LayoutSlot {
  x: number
  y: number
  /** 额外旋转角度（度）。扇形牌阵让牌跟着扇骨转，其余为 0 */
  rotate: number
}

export interface SpreadLayout {
  /** 牌宽占舞台宽度的百分比 */
  cardWidth: number
  /** 舞台宽高比（宽 / 高） */
  aspect: number
  slots: LayoutSlot[]
}

/** 牌面宽高比（上游原图 461×817） */
const CARD_RATIO = 461 / 817

/** 舞台内边距，占舞台高度的百分比，避免牌贴边被裁 */
const STAGE_PAD = 3

/**
 * 从几何坐标反推牌宽，不再手调数字。
 *
 * 手调 15 组牌宽在看不见渲染结果的前提下不可靠——之前就是按张数拍了个表，
 * 结果牌高超出舞台被上下裁掉。改成算：
 *
 * 设牌宽占舞台宽度 w%，则牌高占舞台高度的百分比 = w × aspect / CARD_RATIO
 * （舞台高 = 舞台宽 / aspect，牌高 = 牌宽 / CARD_RATIO）。
 *
 * 两类约束取交集：
 * 1. 纵向容纳：最上/最下的牌不越过内边距；
 * 2. 两两不重叠：一对牌只要「横向错开」或「纵向错开」有一个成立即可，
 *    所以每对取两个候选里较大的那个，再对所有对取最小。
 *    横排牌阵（时间之流三张同 y）靠横向错开，六芒星的顶点与中心牌靠纵向错开。
 */
function fitCardWidth(slots: LayoutSlot[], aspect: number): number {
  const heightPerWidth = aspect / CARD_RATIO

  const ys = slots.map((s) => s.y)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  let w = Math.min(2 * (minY - STAGE_PAD), 2 * (100 - STAGE_PAD - maxY)) / heightPerWidth

  // 迭代收敛：w 变小后「横向已错开」的判定也随之变化，需要重算几轮
  for (let iter = 0; iter < 8; iter += 1) {
    let next = w
    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        const a = slots[i]!
        const b = slots[j]!
        const byWidth = Math.abs(a.x - b.x) * 0.98
        const byHeight = (Math.abs(a.y - b.y) * 0.98) / heightPerWidth
        const limit = Math.max(byWidth, byHeight)
        if (limit < next) next = limit
      }
    }
    if (next >= w * 0.995) break
    w = next
  }

  return Math.max(5, Math.min(30, Math.round(w * 10) / 10))
}

function layout(aspect: number, slots: [number, number, number?][]): SpreadLayout {
  const resolved = slots.map(([x, y, rotate]) => ({ x, y, rotate: rotate ?? 0 }))
  return { cardWidth: fitCardWidth(resolved, aspect), aspect, slots: resolved }
}

/**
 * 正多边形顶点坐标。
 * 舞台宽高比不是 1:1，所以 y 方向要按 aspect 压缩，否则六芒星会被拉成椭圆。
 */
function ring(count: number, radiusY: number, startDeg: number, aspect: number): [number, number, number?][] {
  const out: [number, number, number?][] = []
  for (let i = 0; i < count; i++) {
    const deg = startDeg + (360 / count) * i
    const rad = (deg * Math.PI) / 180
    out.push([
      Math.round((50 + radiusY * aspect * Math.sin(rad)) * 10) / 10,
      Math.round((50 - radiusY * Math.cos(rad)) * 10) / 10,
    ])
  }
  return out
}

export const SPREAD_LAYOUTS: Record<string, SpreadLayout> = {
  // 等边三角，顶点朝下：处境/行动 在上，结果 落底
  holy_triangle: layout(1.5, [[30, 30], [70, 30], [50, 74]]),

  // 横排一字，过去 → 现在 → 未来
  time_flow: layout(2.2, [[19, 50], [50, 50], [81, 50]]),

  // 四要素十字：火(上) 气(右) 水(下) 土(左)，按上游数据顺序顺时针
  four_elements: layout(1.4, [[50, 20], [78, 50], [50, 80], [22, 50]]),

  // 传统十字牌阵：中心=现在，左=过去，右=未来，下=原因，上=结果
  // 上游给的位含义顺序正好是 现在/过去/未来/原因/结果，与这个排法一一对应
  five_cross: layout(1.3, [[50, 50], [22, 50], [78, 50], [50, 82], [50, 18]]),

  // 名不副实的一个：叫十字，位含义却是关系牌阵。按名字排十字，
  // 中心放「相处中存在的问题」，左右是双方想法，上下是环境与结果
  gypsy_cross: layout(1.3, [[22, 50], [78, 50], [50, 50], [50, 18], [50, 82]]),

  // 马蹄拱：传统是 7 张，上游给 6 张，沿用 6 张沿弧排开
  horseshoe: layout(1.5, [[15, 66], [22, 36], [40, 20], [60, 20], [78, 36], [85, 66]]),

  // 六芒星：6 顶点 + 中心。y 半径按 aspect 压成 30，横向才不会被拉扁
  hexagram: layout(1.35, [...ring(6, 30, 0, 1.35), [50, 50]]),

  // 平安扇：以舞台下方一点为轴辐射展开，牌跟着扇骨转
  peace_fan: layout(1.6, [[16, 62, -34], [38, 48, -12], [62, 48, 12], [84, 62, 34]]),

  // 沙迪若之星：六角星，比六芒星更外扩且无中心牌。
  // 半径 32 而不是 38：38 会让 x 落到 -1.3 与 101.3，牌直接画到舞台外
  saddio_star: layout(1.35, ring(6, 32, 0, 1.35)),

  // 灵魂之旅：S 形蜿蜒 5 站
  soul_journey: layout(1.9, [[15, 70], [32, 40], [50, 64], [68, 34], [86, 58]]),

  // 生命之树：卡巴拉树取 6 个节点，根基在底、个人目标与未来展望在顶。
  // y 收在 30~84：原来放到 8/90 时，自动拟合为了容纳边缘牌会把牌宽压到 5.6%
  tree_of_life: layout(1.0, [[50, 84], [28, 66], [72, 66], [50, 48], [30, 30], [70, 30]]),

  // 星光指引：北斗七星，从斗柄末端走到斗口。
  // aspect 收到 1.6（不是 1.9）：舞台越扁，纵向间距折算成牌宽就越少，
  // 斗口两颗星纵向只差 20% 多，扁舞台会把牌宽压到 7%
  starlight: layout(1.6, [[13, 54], [29, 64], [46, 54], [62, 40], [83, 30], [88, 62], [58, 70]]),

  // 月光之路：一道月弧
  moonpath: layout(2.0, [[16, 66], [37, 40], [63, 32], [86, 52]]),

  // 梦境探索：双环，内环 4 张是梦境核心，外环 4 张是延伸。
  // 外环收到 16/84（不是 11/89），理由同生命之树
  dreamscape: layout(1.2, [[38, 38], [62, 38], [62, 62], [38, 62], [50, 16], [84, 50], [50, 84], [16, 50]]),

  // 智慧之门：左右两根门柱 + 上方门楣
  wisdom_gate: layout(1.5, [[28, 64], [72, 64], [50, 22]]),
}

/** 取布局；未知牌阵回落到横排，不让页面开天窗 */
export function layoutOf(key: string, cardsNum: number): SpreadLayout {
  const found = SPREAD_LAYOUTS[key]
  if (found && found.slots.length === cardsNum) return found

  const slots: [number, number, number?][] = []
  for (let i = 0; i < cardsNum; i++) {
    slots.push([Math.round(((i + 1) / (cardsNum + 1)) * 100), 50])
  }
  return layout(Math.max(1.6, cardsNum * 0.55), slots)
}

/** 窄屏降级阈值（px）。低于此宽度改用竖向列表，不画几何 */
export const NARROW_BREAKPOINT = 720
