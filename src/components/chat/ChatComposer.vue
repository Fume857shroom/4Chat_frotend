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
</script>

<template>
  <form class="chat-composer" @submit.prevent="handleSubmit">
    <div class="chat-composer__tools" aria-label="多功能操作">
      <button type="button" @click="emit('announce')">📢</button>
    </div>

    <label class="chat-composer__field">
      <span class="sr-only">输入聊天内容</span>
      <input v-model.trim="message" type="text" placeholder="输入消息，Enter 发送" :disabled="disabled" />
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

.chat-composer__tools button {
  min-width: 48px;
  min-height: 52px;
  padding: 0 14px;
  border-radius: 14px;
  color: var(--text);
  background: rgba(255, 255, 255, 0.06);
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