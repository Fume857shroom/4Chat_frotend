<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PlayableTrack } from '../../types/music'
import { useShareStore } from '../../stores/music/share'
import { showToast } from '../../composables/toast'

// 与后端 share.validator 的 note 上限保持一致
const NOTE_MAX = 200
const SCORES = [1, 2, 3, 4, 5]

const props = defineProps<{
  track: PlayableTrack
}>()

const emit = defineEmits<{
  success: []
  close: []
}>()

const shareStore = useShareStore()

const score = ref(0)
const note = ref('')
const submitting = ref(false)
const errorMsg = ref('')

const songLabel = computed(() => `${props.track.title} - ${props.track.artist}`)

async function onSubmit() {
  if (submitting.value) {
    return
  }

  if (score.value < 1) {
    errorMsg.value = '请先打分（1-5 星）'
    return
  }

  submitting.value = true
  errorMsg.value = ''

  try {
    await shareStore.submitShare({
      songmid: props.track.songmid,
      score: score.value,
      note: note.value.trim(),
    })
    showToast('分享成功')
    emit('success')
  } catch (e: unknown) {
    // 后端的中文 message 原样展示（http 拦截器已挂到 error.message）
    errorMsg.value = e instanceof Error ? e.message : '分享失败，请稍后重试'
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
          <span>分享这首歌</span>
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
                :class="{ 'share-dialog__star--on': value <= score }"
                role="radio"
                :aria-checked="value === score"
                :aria-label="`${value} 星`"
                :disabled="submitting"
                @click="score = value"
              >
                ★
              </button>
              <span class="share-dialog__score-text">{{ score ? `${score} / 5` : '未评分' }}</span>
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
              {{ submitting ? '分享中...' : '分享' }}
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
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.18);
  font-size: 22px;
  line-height: 1;
  transition:
    color 0.15s,
    transform 0.15s;
}

.share-dialog__star:hover:not(:disabled) {
  transform: translateY(-1px);
}

.share-dialog__star--on {
  color: var(--yellow);
}

.share-dialog__star:disabled {
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
