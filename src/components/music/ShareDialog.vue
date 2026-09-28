<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PlayableTrack } from '../../types/music'
import { useShareStore } from '../../stores/music/share'
import { showToast } from '../../composables/toast'
import { errorText } from '../../composables/errorText'

// 与后端 share.validator 的 note 上限保持一致
const NOTE_MAX = 200
/** 星星只画 5 颗，但每颗分左右两半 → 实际档位 0.5/1/1.5/…/5；0 另有入口（不评分） */
const SCORES = [1, 2, 3, 4, 5]

const props = defineProps<{
  track: PlayableTrack
  /**
   * 传入即进入「修改」态：一人一歌只有一条评分记录，重复评分走 PUT 改这条。
   * 只有 id/score/note 可回填——歌曲元数据是入库时的上游快照，不随编辑改变
   */
  existing?: { id: number; score: number; note: string | null }
}>()

const emit = defineEmits<{
  success: []
  close: []
}>()

const shareStore = useShareStore()

const score = ref(props.existing?.score ?? 0)
/**
 * 是否已经明确选过分值。0 是「不评分」这个合法选择，不能再用 score 的真假来判断，
 * 所以单独一个标记：新建分享时必须点一下（打分或点「不评分」），不许什么都不碰就提交。
 */
const chosen = ref(props.existing !== undefined)
const note = ref(props.existing?.note ?? '')
const submitting = ref(false)
const errorMsg = ref('')

const isEdit = computed(() => !!props.existing)
const songLabel = computed(() => `${props.track.title} - ${props.track.artist}`)
const dialogTitle = computed(() => (isEdit.value ? '修改我的评分' : '分享这首歌'))
const scoreHint = computed(() => (score.value === 0 ? '不评分（不进榜单平均分）' : `${score.value} / 5`))
const submitText = computed(() => {
  if (submitting.value) {
    return isEdit.value ? '保存中...' : '分享中...'
  }
  return isEdit.value ? '保存修改' : '分享'
})

/** 某颗星该亮多少：整星 100%、半星 50%、不亮 0% */
function fillPercent(star: number): number {
  if (score.value >= star) {
    return 100
  }
  return score.value >= star - 0.5 ? 50 : 0
}

/** 点星星的左半下 0.5、右半下整星（0.5 档只能从这里出，0 走「不评分」按钮） */
function pickOnStar(star: number, event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const leftHalf = event.clientX - box.left < box.width / 2
  pick(leftHalf ? star - 0.5 : star)
}

function pick(value: number) {
  score.value = value
  chosen.value = true
  errorMsg.value = ''
}

async function onSubmit() {
  if (submitting.value) {
    return
  }

  if (!chosen.value) {
    errorMsg.value = '先点一下星星打分，或者选「不评分」'
    return
  }

  submitting.value = true
  errorMsg.value = ''

  try {
    const text = note.value.trim()
    await shareStore.submitRating(
      props.existing
        ? { id: props.existing.id, score: score.value, note: text }
        : { songmid: props.track.songmid, score: score.value, note: text },
    )
    showToast(isEdit.value ? '已更新评分' : '分享成功')
    emit('success')
  } catch (e: unknown) {
    // 后端的中文 message 原样展示（http 拦截器已挂到 error.message）
    errorMsg.value = errorText(e, '分享失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="dialog-overlay" @click.self="emit('close')">
      <div class="share-dialog" role="dialog" aria-label="分享歌曲">
        <header class="share-dialog__header">
          <span class="share-dialog__icon">🎵</span>
          <span>{{ dialogTitle }}</span>
        </header>

        <p class="share-dialog__song" :title="songLabel">{{ songLabel }}</p>

        <form class="share-dialog__form" @submit.prevent="onSubmit">
          <div class="share-dialog__field">
            <span class="share-dialog__label">评分</span>
            <div class="share-dialog__stars" role="radiogroup" aria-label="评分">
              <button
                v-for="value in SCORES"
                :key="value"
                type="button"
                class="share-dialog__star"
                :class="{ 'share-dialog__star--on': score >= value - 0.5 }"
                role="radio"
                :aria-checked="score === value || score === value - 0.5"
                :aria-label="`${value - 0.5} 或 ${value} 星`"
                :title="`${value - 0.5} 或 ${value} 星（点左半取一半）`"
                :disabled="submitting"
                @click="pickOnStar(value, $event)"
              >
                <!-- 底星是灰的，亮星用同宽裁剪层从左边盖上去，半星就是 width:50% -->
                <span class="share-dialog__star-base">★</span>
                <span class="share-dialog__star-fill" :style="{ width: `${fillPercent(value)}%` }">★</span>
              </button>

              <button
                type="button"
                class="share-dialog__skip"
                :class="{ 'share-dialog__skip--on': score === 0 }"
                :disabled="submitting"
                title="分享这首歌但不打分：算一次分享，不进榜单平均分"
                @click="pick(0)"
              >
                不评分
              </button>

              <span class="share-dialog__score-text">{{ scoreHint }}</span>
            </div>
          </div>

          <label class="share-dialog__field">
            <span class="share-dialog__label">想说的话（选填）</span>
            <textarea
              v-model="note"
              :maxlength="NOTE_MAX"
              rows="4"
              placeholder="为什么推荐这首歌？"
              :disabled="submitting"
            ></textarea>
            <span class="share-dialog__count">{{ note.length }}/{{ NOTE_MAX }}</span>
          </label>

          <p v-if="errorMsg" class="share-dialog__error">{{ errorMsg }}</p>

          <div class="share-dialog__actions">
            <button
              type="button"
              class="share-dialog__cancel"
              :disabled="submitting"
              @click="emit('close')"
            >
              取消
            </button>
            <button type="submit" class="share-dialog__submit" :disabled="submitting">
              {{ submitText }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
}

.share-dialog {
  width: 400px;
  max-width: calc(100vw - 40px);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(180deg, rgba(20, 20, 30, 0.98), rgba(10, 10, 15, 0.98)),
    var(--panel);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(18px);
  overflow: hidden;
}

.share-dialog__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--line);
  color: var(--text);
}

.share-dialog__icon {
  font-size: 20px;
}

.share-dialog__song {
  padding: 12px 20px 0;
  color: var(--muted);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-dialog__form {
  display: grid;
  gap: 16px;
  padding: 16px 20px 20px;
}

.share-dialog__field {
  display: grid;
  gap: 6px;
}

.share-dialog__label {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.06em;
}

/* --- 星级选择 --- */
.share-dialog__stars {
  display: flex;
  align-items: center;
  gap: 4px;
}

.share-dialog__star {
  position: relative;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.18);
  font-size: 22px;
  line-height: 1;
  /* 左半/右半是两个不同的分值，光标要能提示这不是"点一下整颗" */
  cursor: col-resize;
  transition:
    color 0.15s,
    transform 0.15s;
}

.share-dialog__star:hover:not(:disabled) {
  transform: translateY(-1px);
}

.share-dialog__star-base,
.share-dialog__star-fill {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.share-dialog__star-base {
  color: rgba(255, 255, 255, 0.18);
}

/* 裁剪层：只占 50% 宽就只亮左半边，字符本身不能跟着缩 */
.share-dialog__star-fill {
  width: 0;
  overflow: hidden;
  color: var(--yellow);
  justify-content: flex-start;
  white-space: pre;
  pointer-events: none;
}

.share-dialog__star--on .share-dialog__star-base {
  color: rgba(255, 228, 92, 0.18);
}

.share-dialog__skip {
  margin-left: 6px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.share-dialog__skip--on {
  border-color: rgba(255, 228, 92, 0.45);
  color: var(--yellow);
  background: rgba(255, 228, 92, 0.08);
}

.share-dialog__star:disabled,
.share-dialog__skip:disabled {
  cursor: wait;
}

.share-dialog__score-text {
  margin-left: 8px;
  color: var(--muted);
  font-size: 12px;
}

.share-dialog__field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.04);
  outline: none;
  font: inherit;
  font-size: 14px;
  resize: vertical;
}

.share-dialog__field textarea:focus {
  border-color: rgba(0, 240, 255, 0.7);
  box-shadow: 0 0 0 4px rgba(0, 240, 255, 0.12);
}

.share-dialog__field textarea::placeholder {
  color: var(--muted);
}

.share-dialog__count {
  align-self: flex-end;
  color: var(--muted);
  font-size: 11px;
}

.share-dialog__error {
  padding: 10px 12px;
  border-radius: 12px;
  color: #fff2f5;
  background: rgba(255, 45, 85, 0.12);
  border: 1px solid rgba(255, 45, 85, 0.24);
  font-size: 13px;
}

.share-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.share-dialog__cancel {
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.share-dialog__cancel:hover {
  background: rgba(255, 255, 255, 0.06);
}

.share-dialog__submit {
  padding: 10px 24px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--cyan), #8dffcf);
  color: #081017;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.share-dialog__submit:hover {
  transform: translateY(-1px);
}

.share-dialog__submit:disabled {
  cursor: wait;
  opacity: 0.7;
  transform: none;
}

.share-dialog__cancel:disabled {
  cursor: wait;
  opacity: 0.5;
}
</style>
