<script setup lang="ts">
import { useToast } from '../composables/toast'

const { visible, message } = useToast()
</script>

<template>
  <Teleport to="body">
    <transition name="toast-fade">
      <div v-if="visible" class="app-toast">
        {{ message }}
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.app-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  padding: 12px 24px;
  border-radius: 12px;
  background: rgba(20, 20, 30, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text);
  font-size: 14px;
  letter-spacing: 0.04em;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  white-space: nowrap;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>