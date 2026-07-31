import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

export function showToast(text: string, duration = 2000) {
  message.value = text
  visible.value = true

  if (timer !== null) {
    clearTimeout(timer)
  }

  timer = setTimeout(() => {
    visible.value = false
  }, duration)
}

export function useToast() {
  return { visible, message, showToast }
}