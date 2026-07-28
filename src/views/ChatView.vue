<script setup lang="ts">
import { ref } from 'vue'
import ChatComposer from '../components/ChatComposer.vue'
import InfoPanel from '../components/InfoPanel.vue'

interface MessageItem {
  id: number
  author: string
  text: string
  own?: boolean
  time: string
}

const draft = ref('')
const messages = ref<MessageItem[]>([
  { id: 1, author: 'System', text: '欢迎来到 4Chat，当前聊天功能页面已就绪。', time: '09:00' },
  { id: 2, author: 'Nova', text: '左侧面板后续可以继续接在线用户、公告和媒体数据。', time: '09:03' },
  { id: 3, author: 'You', text: '收到，先把页面骨架搭起来。', own: true, time: '09:05' },
])

const onlineUsers = ['Aster', 'Nova', 'Iris', 'Milo', 'Kite']
const mediaItems = ['封面图.psd', '聊天截图.png', '活动海报.fig']

function handleSend() {
  if (!draft.value) {
    return
  }

  messages.value.push({
    id: Date.now(),
    author: 'You',
    text: draft.value,
    own: true,
    time: new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  })

  draft.value = ''
}
</script>

<template>
  <section class="chat-page">
    <aside class="chat-page__meta">
      <InfoPanel title="在线用户" accent="#00f0ff">
        <ul class="meta-list">
          <li v-for="user in onlineUsers" :key="user">
            <span class="meta-list__status"></span>
            {{ user }}
          </li>
        </ul>
      </InfoPanel>

      <InfoPanel title="公告" accent="#ff2d55">
        <div class="notice-card">
          <p>本周优先完善聊天流与消息展示，后续将补充媒体上传与会话列表。</p>
        </div>
      </InfoPanel>

      <InfoPanel title="媒体库" accent="#ffe45c">
        <ul class="media-list">
          <li v-for="item in mediaItems" :key="item">{{ item }}</li>
        </ul>
      </InfoPanel>
    </aside>

    <div class="chat-room">
      <header class="chat-room__header">
        <div>
          <p class="eyebrow">LIVE CHANNEL</p>
          <h1>聊天功能页</h1>
        </div>
        <span class="chat-room__tag">默认频道</span>
      </header>

      <div class="chat-room__messages">
        <article
          v-for="message in messages"
          :key="message.id"
          class="message-card"
          :class="{ 'message-card--own': message.own }"
        >
          <header>
            <strong>{{ message.author }}</strong>
            <time>{{ message.time }}</time>
          </header>
          <p>{{ message.text }}</p>
        </article>
      </div>

      <ChatComposer v-model="draft" @submit="handleSend" />
    </div>
  </section>
</template>
