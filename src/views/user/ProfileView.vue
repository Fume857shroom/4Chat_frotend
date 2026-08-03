<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import ProfileEditDrawer from '../../components/user/ProfileEditDrawer.vue'
import AvatarCropper from '../../components/user/AvatarCropper.vue'
import { showToast } from '../../composables/toast'

const userStore = useUserStore()

const drawerOpen = ref(false)
const drawerMode = ref<'profile' | 'status'>('profile')
const previewVisible = ref(false)
const activeTab = ref<'profile'>('profile')

// 头像裁剪弹窗状态
const cropVisible = ref(false)
const cropImageUrl = ref('')

const profile = computed(() => userStore.profile)

const avatarSrc = computed(() => {
  const avatar = profile.value?.avatar
  if (!avatar) {
    return ''
  }
  if (/^https?:\/\//.test(avatar)) {
    return avatar
  }
  return `${import.meta.env.VITE_API_BASE_URL || ''}${avatar}`
})

onMounted(async () => {
  try {
    await userStore.fetchUserProfile()
  } catch {
    showToast('个人资料加载失败')
  }
})

function openProfileDrawer() {
  drawerMode.value = 'profile'
  drawerOpen.value = true
}

function openStatusDrawer() {
  drawerMode.value = 'status'
  drawerOpen.value = true
}

// 选择文件后：本地预览 → 打开裁剪弹窗，确认后才上传
function handleAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    cropImageUrl.value = String(reader.result)
    cropVisible.value = true
  }
  reader.readAsDataURL(file)
}

// 裁剪确认：上传裁剪后的 Blob
async function handleCropConfirm(blob: Blob) {
  cropVisible.value = false
  try {
    await userStore.uploadAvatar(blob)
    showToast('头像上传成功')
  } catch {
    showToast('头像上传失败')
  }
}
</script>

<template>
  <section class="profile-page">
    <div class="profile-page__main">
      <!-- ===== 顶部个人概览 ===== -->
      <div class="profile-card">
        <div class="profile-card__left">
          <button
            type="button"
            class="profile-card__avatar"
            title="点击预览大图"
            @click="previewVisible = true"
          >
            <img v-if="avatarSrc" :src="avatarSrc" alt="头像" />
            <span v-else class="profile-card__avatar-placeholder">
              {{ (profile?.nickname || '我').charAt(0) }}
            </span>
          </button>

          <label class="profile-card__avatar-edit" title="更换头像">
            更换头像
            <input type="file" accept="image/*" hidden @change="handleAvatarChange" />
          </label>
        </div>

        <div class="profile-card__info">
          <h1>{{ profile?.nickname || profile?.username || '加载中...' }}</h1>
          <button type="button" class="profile-card__status" @click="openStatusDrawer">
            <span class="profile-card__status-dot"></span>
            {{ profile?.status || '设置心情' }}
          </button>
        </div>
      </div>

      <!-- ===== 统计勋章 ===== -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-card__value">{{ profile?.sentMessageCount ?? '--' }}</span>
          <span class="stat-card__label">已发送消息（条）</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">{{ profile?.activeHours ?? '--' }}</span>
          <span class="stat-card__label">活跃时间（H）</span>
        </div>
      </div>

      <!-- ===== Tab 区 ===== -->
      <div class="profile-tabs">
        <div class="profile-tabs__nav">
          <button
            type="button"
            class="profile-tabs__tab"
            :class="{ 'is-active': activeTab === 'profile' }"
            @click="activeTab = 'profile'"
          >
            个人资料
          </button>
        </div>

        <div class="profile-tabs__panel">
          <div class="info-row">
            <span class="info-row__label">昵称</span>
            <span class="info-row__value">{{ profile?.nickname || '未设置' }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">出生日期</span>
            <span class="info-row__value">{{ profile?.birthday ? profile.birthday.slice(0, 10) : '未设置' }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">性别</span>
            <span class="info-row__value">{{ profile?.gender || '未设置' }}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">当前城市</span>
            <span class="info-row__value">{{ profile?.city || '未设置' }}</span>
          </div>

          <button type="button" class="profile-tabs__edit" @click="openProfileDrawer">
            编辑个人资料
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 头像大图预览 ===== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="previewVisible" class="avatar-preview" @click="previewVisible = false">
          <img v-if="avatarSrc" :src="avatarSrc" alt="头像大图" />
          <span v-else class="avatar-preview__placeholder">
            {{ (profile?.nickname || '我').charAt(0) }}
          </span>
        </div>
      </Transition>
    </Teleport>

    <!-- ===== 头像裁剪弹窗 ===== -->
    <AvatarCropper
      :visible="cropVisible"
      :image-url="cropImageUrl"
      @close="cropVisible = false"
      @confirm="handleCropConfirm"
    />

    <!-- ===== 右侧编辑抽屉 ===== -->
    <ProfileEditDrawer
      :open="drawerOpen"
      :mode="drawerMode"
      @close="drawerOpen = false"
    />
  </section>
</template>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  padding: 32px 0;
  overflow-y: auto;
  height: 100%;
}

.profile-page__main {
  width: min(100%, 860px);
  display: grid;
  gap: 24px;
  align-content: start;
}

/* --- 顶部概览卡 --- */
.profile-card {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 28px;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(135deg, rgba(0, 240, 255, 0.06), transparent 55%),
    linear-gradient(315deg, rgba(255, 45, 85, 0.05), transparent 55%),
    var(--panel);
  box-shadow: var(--shadow);
}

.profile-card__left {
  display: grid;
  justify-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.profile-card__avatar {
  width: 96px;
  height: 96px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s;
}

.profile-card__avatar:hover {
  transform: scale(1.03);
}

.profile-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-card__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  background: linear-gradient(135deg, hsl(190 55% 42%), hsl(230 60% 30%));
}

.profile-card__avatar-edit {
  padding: 6px 14px;
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 999px;
  color: var(--cyan);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.profile-card__avatar-edit:hover {
  background: rgba(0, 240, 255, 0.1);
}

.profile-card__info {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.profile-card__info h1 {
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 32px);
  letter-spacing: 0.06em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 心情气泡 */
.profile-card__status {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid rgba(255, 228, 92, 0.35);
  border-radius: 999px;
  background: rgba(255, 228, 92, 0.08);
  color: var(--yellow);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.profile-card__status:hover {
  background: rgba(255, 228, 92, 0.16);
  transform: translateY(-1px);
}

.profile-card__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 0 0 10px rgba(255, 228, 92, 0.8);
}

/* --- 统计勋章 --- */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  display: grid;
  gap: 6px;
  padding: 20px 24px;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
}

.stat-card__value {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 700;
  background: linear-gradient(90deg, var(--cyan), var(--pink));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.stat-card__label {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* --- Tab 区 --- */
.profile-tabs {
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--panel);
  overflow: hidden;
}

.profile-tabs__nav {
  display: flex;
  gap: 4px;
  padding: 12px 16px 0;
  border-bottom: 1px solid var(--line);
}

.profile-tabs__tab {
  padding: 10px 18px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s;
}

.profile-tabs__tab.is-active {
  color: var(--text);
  border-bottom-color: var(--cyan);
}

.profile-tabs__panel {
  display: grid;
  gap: 14px;
  padding: 20px 24px 24px;
}

.info-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.07);
}

.info-row__label {
  color: var(--muted);
  font-size: 13px;
}

.info-row__value {
  font-size: 14px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-tabs__edit {
  justify-self: end;
  margin-top: 6px;
  padding: 10px 22px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--cyan), #8dffcf);
  color: #081017;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: transform 0.2s;
}

.profile-tabs__edit:hover {
  transform: translateY(-1px);
}

/* --- 头像大图预览 --- */
.avatar-preview {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 40px;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(8px);
  cursor: zoom-out;
}

.avatar-preview img {
  max-width: min(480px, 90vw);
  max-height: 80vh;
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}

.avatar-preview__placeholder {
  width: 200px;
  height: 200px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  font-size: 64px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  background: linear-gradient(135deg, hsl(190 55% 42%), hsl(230 60% 30%));
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