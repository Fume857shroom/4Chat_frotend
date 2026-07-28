<script setup lang="ts">
const message = defineModel<string>({
  required: true,
})

const emit = defineEmits<{
  submit: []
}>()

function handleSubmit() {
  emit('submit')
}
</script>

<template>
  <form class="chat-composer" @submit.prevent="handleSubmit">
    <div class="chat-composer__tools" aria-label="多功能操作">
      <button type="button">+</button>
      <button type="button">GIF</button>
      <button type="button">@</button>
    </div>

    <label class="chat-composer__field">
      <span class="sr-only">输入聊天内容</span>
      <input v-model.trim="message" type="text" placeholder="输入消息，Enter 发送" />
    </label>

    <button type="submit" class="chat-composer__send">发送</button>
  </form>
</template>
