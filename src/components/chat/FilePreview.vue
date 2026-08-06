<script setup lang="ts">
import { onUnmounted, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  url: string
  name?: string
  size?: string
}>()

const emit = defineEmits<{ close: [] }>()

// Esc 关闭；可见时挂载监听，关闭时移除
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    emit('close')
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div v-if="visible" class="file-preview" @click.self="emit('close')">
        <img class="file-preview__image" :src="url" :alt="name" />
        <div class="file-preview__bar">
          <span class="file-preview__name">{{ name }}</span>
          <span v-if="size" class="file-preview__size">{{ size }}</span>
        </div>
        <button type="button" class="file-preview__close" title="关闭（Esc）" @click="emit('close')">
          ✕
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.file-preview {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 48px;
  background: rgba(0, 0, 0, 0.86);
  backdrop-filter: blur(8px);
  cursor: zoom-out;
}

.file-preview__image {
  max-width: min(920px, 92vw);
  max-height: 86vh;
  border-radius: 12px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  user-select: none;
}

.file-preview__bar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 80vw;
  padding: 8px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  font-size: 13px;
  color: var(--text);
}

.file-preview__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-preview__size {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 12px;
}

.file-preview__close {
  position: fixed;
  top: 20px;
  right: 24px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.file-preview__close:hover {
  background: rgba(255, 45, 85, 0.25);
  transform: rotate(90deg);
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.2s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}
</style>
