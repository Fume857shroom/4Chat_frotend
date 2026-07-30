<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAnnounceStore } from '../stores/announce'
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