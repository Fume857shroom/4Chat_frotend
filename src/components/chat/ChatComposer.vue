<script setup lang="ts">
import throttle from 'lodash/throttle'

const message = defineModel<string>({
  required: true,
})

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: []
  announce: []
  file: [file: File]
}>()

const throttledSubmit = throttle(() => {
  emit('submit')
}, 500)

function handleSubmit() {
  if (props.disabled || !message.value) {
    return
  }

  throttledSubmit()
}

// 选择文件后立即触发上传（由父组件调用 store.sendFile），并重置 input 以便重复选择同一文件
function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  emit('file', file)
}
</script>

<template>
  <form class="chat-composer" @submit.prevent="handleSubmit">
    <div class="chat-composer__tools" aria-label="多功能操作">
      <label class="chat-composer__file" title="发送文件">
        📎
        <input type="file" hidden @change="handleFileChange" />
      </label>
      <button type="button" @click="emit('announce')">📢</button>
    </div>

    <label class="chat-composer__field">
      <span class="sr-only">输入聊天内容</span>
      <input
        v-model.trim="message"
        type="text"
        maxlength="2000"
        placeholder="输入消息，Enter 发送"
        :disabled="disabled"
      />
    </label>

    <button
      type="submit"
      class="chat-composer__send"
      :class="{ 'chat-composer__send--loading': disabled }"
      :disabled="disabled"
    >
      {{ disabled ? '发送中...' : '发送' }}
    </button>
  </form>
</template>

<style scoped>
.chat-composer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: 18px 24px 24px;
  border-top: 1px solid var(--line);
}

.chat-composer__tools {
  display: flex;
  gap: 8px;
}

.chat-composer__tools button,
.chat-composer__tools label {
  display: grid;
  place-items: center;
  min-width: 48px;
  min-height: 52px;
  padding: 0 14px;
  border-radius: 14px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background 0.2s;
}

.chat-composer__tools button:hover,
.chat-composer__tools label:hover {
  background: rgba(0, 240, 255, 0.12);
}

.chat-composer__send {
  min-width: 112px;
  color: #081017;
  background: linear-gradient(90deg, var(--cyan), #8dffcf);
}

@media (max-width: 720px) {
  .chat-composer {
    grid-template-columns: 1fr;
  }

  .chat-composer__tools {
    order: 2;
  }

  .chat-composer__send {
    order: 3;
  }
}
</style>