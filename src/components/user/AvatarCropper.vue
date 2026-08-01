<script setup lang="ts">
import { ref, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const props = defineProps<{
  visible: boolean
  imageUrl: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [blob: Blob]
}>()

const imgRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null
let initializedForUrl = ''

function initCropper() {
  const img = imgRef.value
  if (!img || !props.visible || !props.imageUrl) {
    return
  }
  // 同一张图只初始化一次，避免重复实例
  if (initializedForUrl === props.imageUrl && cropper) {
    return
  }
  cropper?.destroy()
  initializedForUrl = props.imageUrl
  cropper = new Cropper(img, {
    aspectRatio: 1, // 正方形，匹配头像形状
    viewMode: 1, // 裁剪框限制在图片内
    autoCropArea: 0.8,
    background: false,
    modal: true,
    guides: false,
    center: true,
    highlight: false,
  })
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      // 图片可能仍在加载，等 onload 再初始化
      if (imgRef.value?.complete) {
        initCropper()
      }
    } else {
      cropper?.destroy()
      cropper = null
      initializedForUrl = ''
    }
  },
)

function handleImgLoad() {
  initCropper()
}

function handleConfirm() {
  if (!cropper) {
    return
  }
  const canvas = cropper.getCroppedCanvas({
    width: 256,
    height: 256,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  })
  canvas.toBlob(
    (blob) => {
      if (blob) {
        emit('confirm', blob)
      }
    },
    'image/jpeg',
    0.9,
  )
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="cropper-modal" @click.self="emit('close')">
        <div class="cropper-modal__box">
          <header class="cropper-modal__header">
            <h3>裁剪头像</h3>
            <button type="button" class="cropper-modal__close" aria-label="关闭" @click="emit('close')">✕</button>
          </header>

          <div class="cropper-modal__stage">
            <img ref="imgRef" :src="imageUrl" alt="待裁剪图片" @load="handleImgLoad" />
          </div>

          <p class="cropper-modal__hint">拖动或缩放裁剪框，调整到头像合适的位置</p>

          <div class="cropper-modal__actions">
            <button type="button" class="cropper-modal__cancel" @click="emit('close')">取消</button>
            <button type="button" class="cropper-modal__submit" @click="handleConfirm">确认</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cropper-modal {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
}

.cropper-modal__box {
  width: min(520px, 92vw);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(180deg, rgba(20, 20, 30, 0.98), rgba(10, 10, 15, 0.98)),
    var(--panel);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.cropper-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
}

.cropper-modal__header h3 {
  font-size: 15px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.cropper-modal__close {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.04);
  font: inherit;
  cursor: pointer;
}

.cropper-modal__stage {
  position: relative;
  max-height: 60vh;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
}

.cropper-modal__stage img {
  display: block;
  max-width: 100%;
}

.cropper-modal__hint {
  padding: 12px 20px 0;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.cropper-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px 20px;
}

.cropper-modal__cancel {
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.cropper-modal__cancel:hover {
  background: rgba(255, 255, 255, 0.06);
}

.cropper-modal__submit {
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
  transition: transform 0.2s;
}

.cropper-modal__submit:hover {
  transform: translateY(-1px);
}

/* --- 裁剪框样式：圆角方形，匹配头像 border-radius: 12px --- */
:deep(.cropper-view-box) {
  border-radius: 12px;
  outline: 2px solid rgba(0, 240, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(0, 240, 255, 0.5);
}

:deep(.cropper-dashed),
:deep(.cropper-line),
:deep(.cropper-point) {
  display: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>