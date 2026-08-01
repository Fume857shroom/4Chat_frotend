<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAnnounceStore } from '../../stores/chat/announce'
import axios from 'axios'

const emit = defineEmits<{
  success: []
  close: []
}>()

const store = useAnnounceStore()

const form = ref({ title: '', content: '' })
const submitting = ref(false)
const errorMsg = ref('')

// --- Draggable ---
const pos = ref({ x: 0, y: 0 })
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0, posX: 0, posY: 0 })

onMounted(() => {
  pos.value = {
    x: Math.max((window.innerWidth - 420) / 2, 20),
    y: Math.max((window.innerHeight - 380) / 2, 20),
  }
})

function onHeaderMouseDown(e: MouseEvent) {
  dragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY, posX: pos.value.x, posY: pos.value.y }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!dragging.value) return
  pos.value = {
    x: dragStart.value.posX + (e.clientX - dragStart.value.x),
    y: dragStart.value.posY + (e.clientY - dragStart.value.y),
  }
}

function onMouseUp() {
  dragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

async function onSubmit() {
  if (!form.value.title || !form.value.content) {
    errorMsg.value = '请填写标题和内容'
    return
  }
  submitting.value = true
  errorMsg.value = ''
  try {
    await store.createAnnounce(form.value.title, form.value.content)
    emit('success')
  } catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      errorMsg.value = String(e.response?.data?.message || e.message)
    } else {
      errorMsg.value = '创建失败，请重试'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="dialog-overlay" @click.self="emit('close')">
      <div
        class="announce-dialog"
        :style="{
          left: pos.x + 'px',
          top: pos.y + 'px',
          cursor: dragging ? 'grabbing' : 'default',
        }"
      >
        <header class="announce-dialog__header" @mousedown.prevent="onHeaderMouseDown">
          <span class="announce-dialog__icon">📢</span>
          <span>发布公告</span>
        </header>

        <form class="announce-dialog__form" @submit.prevent="onSubmit">
          <label>
            <span>标题</span>
            <input
              v-model="form.title"
              type="text"
              placeholder="公告标题"
              maxlength="150"
              :disabled="submitting"
            />
          </label>

          <label>
            <span>内容</span>
            <textarea
              v-model="form.content"
              placeholder="公告内容"
              rows="4"
              :disabled="submitting"
            ></textarea>
          </label>

          <p v-if="errorMsg" class="announce-dialog__error">{{ errorMsg }}</p>

          <div class="announce-dialog__actions">
            <button type="button" class="announce-dialog__cancel" :disabled="submitting" @click="emit('close')">
              取消
            </button>
            <button type="submit" class="announce-dialog__submit" :disabled="submitting">
              {{ submitting ? '发布中...' : '发布' }}
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

.announce-dialog {
  position: fixed;
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
  user-select: none;
}

.announce-dialog__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--line);
  cursor: grab;
  color: var(--text);
}

.announce-dialog__header:active {
  cursor: grabbing;
}

.announce-dialog__icon {
  font-size: 20px;
}

.announce-dialog__form {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.announce-dialog__form label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.06em;
}

.announce-dialog__form input,
.announce-dialog__form textarea {
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

.announce-dialog__form input:focus,
.announce-dialog__form textarea:focus {
  border-color: rgba(0, 240, 255, 0.7);
  box-shadow: 0 0 0 4px rgba(0, 240, 255, 0.12);
}

.announce-dialog__error {
  padding: 10px 12px;
  border-radius: 12px;
  color: #fff2f5;
  background: rgba(255, 45, 85, 0.12);
  border: 1px solid rgba(255, 45, 85, 0.24);
  font-size: 13px;
}

.announce-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.announce-dialog__cancel {
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

.announce-dialog__cancel:hover {
  background: rgba(255, 255, 255, 0.06);
}

.announce-dialog__submit {
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
  transition: transform 0.2s, box-shadow 0.2s;
}

.announce-dialog__submit:hover {
  transform: translateY(-1px);
}

.announce-dialog__submit:disabled {
  cursor: wait;
  opacity: 0.7;
  transform: none;
}

.announce-dialog__cancel:disabled {
  cursor: wait;
  opacity: 0.5;
}
</style>