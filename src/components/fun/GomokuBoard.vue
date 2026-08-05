<script setup lang="ts">
interface Cell {
  x: number
  y: number
}

const props = defineProps<{
  colorAt: (x: number, y: number) => 'black' | 'white' | null
  placeStone: (x: number, y: number) => boolean | Promise<boolean>
  gameOver: boolean
  disabled: boolean // 观战/未轮到我时禁止交互
  lastMove: { x: number; y: number } | null
}>()

const BOARD_SIZE = 15

// 生成 225 个格子的坐标，供 v-for 渲染
const cells: Cell[] = []
for (let y = 0; y < BOARD_SIZE; y++) {
  for (let x = 0; x < BOARD_SIZE; x++) {
    cells.push({ x, y })
  }
}

function handleClick(x: number, y: number) {
  if (props.gameOver) return // 游戏结束 → 拒绝点击
  if (props.disabled) return // 观战/未轮到我 → 拒绝点击
  props.placeStone(x, y)     // 交给父组件的游戏逻辑处理
}

// 传统星位点：15 路棋盘的 5 个星位（四角星 + 天元）
function isStar(x: number, y: number): boolean {
  const corner = (x === 3 || x === 11) && (y === 3 || y === 11)
  return corner || (x === 7 && y === 7)
}
</script>

<template>
  <div class="board" :class="{ 'board--over': gameOver, 'board--disabled': disabled }">
    <div
      v-for="cell in cells"
      :key="`${cell.x}-${cell.y}`"
      class="cell"
      :class="{
        'cell--has-stone': colorAt(cell.x, cell.y) !== null,
        'cell--last': lastMove?.x === cell.x && lastMove?.y === cell.y,
        'cell--star': isStar(cell.x, cell.y),
      }"
      @click="handleClick(cell.x, cell.y)"
    >
      <!-- 格子里有子 → 渲染棋子 -->
      <span v-if="colorAt(cell.x, cell.y)" class="stone" :class="colorAt(cell.x, cell.y)" />
    </div>
  </div>
</template>

<style scoped>
/* ===== 棋盘面板 ===== */

/* 棋盘：深色木质 + 青粉霓虹光晕；网格线用背景绘制（交叉点均匀不叠加） */
.board {
  display: grid;
  grid-template-columns: repeat(15, 32px);
  width: fit-content;
  flex-shrink: 0;   /* 固定大小：不被 flex 布局压缩 */
  align-self: flex-start; /* 不被父容器纵向拉伸 */
  padding: 16px;
  border: 1px solid rgba(0, 240, 255, 0.28);
  border-radius: var(--radius-lg);
  box-shadow:
    inset 0 0 28px rgba(0, 240, 255, 0.05), /* 面板内部环境光 */
    0 1px 0 rgba(255, 255, 255, 0.06),      /* 顶边缘受光 → 厚度感 */
    0 14px 30px rgba(0, 0, 0, 0.5);         /* 底部投影 → 悬浮感 */
  /* 背景层从上到下：网格线 → 霓虹光晕 → 细木纹 → 深色木底 */
  background:
    /* 竖线：每格右边界一条（31-32px），交叉点不叠加 */
    repeating-linear-gradient(
      to right,
      transparent 0 31px,
      rgba(0, 240, 255, 0.22) 31px 32px
    ),
    /* 横线：每格下边界一条 */
    repeating-linear-gradient(
      to bottom,
      transparent 0 31px,
      rgba(0, 240, 255, 0.22) 31px 32px
    ),
    /* 左缘线：比内线更亮，模拟真实棋盘的粗外框 */
    linear-gradient(to right, rgba(0, 240, 255, 0.32) 0 1px, transparent 1px),
    /* 上缘线 */
    linear-gradient(to top, rgba(0, 240, 255, 0.32) 0 1px, transparent 1px),
    /* 霓虹光晕（程序风格） */
    radial-gradient(circle at 12% 8%, rgba(0, 240, 255, 0.1), transparent 42%),
    radial-gradient(circle at 88% 92%, rgba(255, 45, 85, 0.08), transparent 40%),
    /* 细斜木纹：低对比，仅增强真实感不抢戏 */
    repeating-linear-gradient(
      98deg,
      rgba(255, 255, 255, 0.02) 0 1px,
      transparent 1px 7px
    ),
    /* 木底色 */
    linear-gradient(160deg, #111927 0%, #0a101b 100%);
  /* 线层只在内容区（padding 内侧），材质层铺满整个面板 */
  background-origin:
    content-box, content-box, content-box, content-box,
    padding-box, padding-box, padding-box, padding-box;
  background-clip:
    content-box, content-box, content-box, content-box,
    border-box, border-box, border-box, border-box;
}

/* ===== 格子 ===== */

/* 每个格子：32×32 正方形，无边框（网格线由棋盘背景绘制） */
.cell {
  width: 32px;
  height: 32px;
  position: relative;
  cursor: pointer;
}

/* 星位点：四角 + 天元，青色实点带微光 */
.cell--star::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(0, 240, 255, 0.75);
  box-shadow: 0 0 6px rgba(0, 240, 255, 0.5);
}

/* 有子的格子不再显示手型 */
.cell--has-stone {
  cursor: default;
}

/* 悬停预览：可落子时显示"幽灵棋子"（虚线描边，示意落点） */
.board:not(.board--disabled) .cell:not(.cell--has-stone):hover::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 240, 255, 0.09);
  border: 1px dashed rgba(0, 240, 255, 0.4);
}

/* ===== 棋子 ===== */

/* 棋子：绝对定位在格子中心（格子 32px，棋子 24px，四周各留 4px） */
.stone {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  pointer-events: none; /* 点击穿透：点棋子也落在格子上 */
  /* 落子动画：从放大回落，轻微回弹 */
  animation: stone-drop 0.08s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes stone-drop {
  from {
    transform: scale(1.45);
    opacity: 0.35;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 黑子：球面受光（左上亮）+ 青色描边辉光 + 底部投影 */
.stone.black {
  background: radial-gradient(
    circle at 35% 28%,
    #333a4d 0%,
    #151823 40%,
    #07080d 100%
  );
  border: 1px solid rgba(0, 240, 255, 0.5);
  box-shadow:
    inset -2px -3px 6px rgba(0, 0, 0, 0.65), /* 球体暗部 */
    0 3px 7px rgba(0, 0, 0, 0.55),           /* 投影：棋子浮在棋盘上 */
    0 0 10px rgba(0, 240, 255, 0.16);        /* 霓虹辉光 */
}

/* 白子：瓷白球面 + 青色淡描边 + 柔光 */
.stone.white {
  background: radial-gradient(
    circle at 35% 28%,
    #ffffff 0%,
    #edf1f6 50%,
    #c6cfda 100%
  );
  border: 1px solid rgba(0, 240, 255, 0.35);
  box-shadow:
    inset -2px -3px 6px rgba(0, 0, 0, 0.18), /* 球体暗部 */
    0 3px 7px rgba(0, 0, 0, 0.4),            /* 投影 */
    0 0 8px rgba(255, 255, 255, 0.1);        /* 柔光 */
}

/* 最后落子标记：粉色圆点 + 光环 */
.cell--last .stone::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--pink);
  box-shadow:
    0 0 8px rgba(255, 45, 85, 0.85),
    0 0 0 3px rgba(255, 45, 85, 0.22);
}

/* 游戏结束：整盘禁止点击 */
.board--over .cell {
  cursor: not-allowed;
}

/* 观战/未轮到我：整盘禁止点击，无手型 */
.board--disabled .cell {
  cursor: default;
}
</style>