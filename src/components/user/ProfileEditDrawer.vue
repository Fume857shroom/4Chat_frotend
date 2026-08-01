<!-- ==========================================
     src/components/user/ProfileEditDrawer.vue
     个人中心右侧编辑抽屉
     ========================================== -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserStore } from '../../stores/user'
import { showToast } from '../../composables/toast'

const props = defineProps<{
  open: boolean
  mode: 'profile' | 'status'
}>()

const emit = defineEmits<{
  close: []
}>()

const userStore = useUserStore()

const profileForm = ref({
  nickname: '',
  birthday: '',
  gender: '',
  city: '',
})
const statusText = ref('')
const submitting = ref(false)

// 预设心情文案
const statusPresets = [
  '吃什么？',
  '我不同意！',
  '拉屎',
  '给你一拳',
  '纯粹摸鱼中 🐟',
  '不想上班',
  '冲！',
  '营业中',
]

// 每次打开抽屉时，从 store 同步表单初值
watch(
  () => props.open,
  (open) => {
    if (!open || !userStore.profile) {
      return
    }
    const p = userStore.profile
    profileForm.value = {
      nickname: p.nickname,
      // 只取 YYYY-MM-DD 部分，兼容后端返回完整时间戳
      birthday: p.birthday ? p.birthday.slice(0, 10) : '',
      gender: p.gender,
      city: p.city,
    }
    statusText.value = p.status
  },
)

async function submitProfile() {
  submitting.value = true
  try {
    await userStore.updateProfile({
      nickname: profileForm.value.nickname,
      // 提交时只传 YYYY-MM-DD，不传时间部分
      birthday: profileForm.value.birthday
        ? profileForm.value.birthday.slice(0, 10)
        : null,
      gender: profileForm.value.gender,
      city: profileForm.value.city,
    })
    showToast('个人资料已保存')
    emit('close')
  } catch {
    showToast('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function submitStatus() {
  if (!statusText.value.trim()) {
    showToast('心情不能为空')
    return
  }
  submitting.value = true
  try {
    await userStore.updateStatus(statusText.value.trim())
    showToast('心情已更新')
    emit('close')
  } catch {
    showToast('更新失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Transition name="drawer">
    <aside v-if="open" class="profile-drawer">
      <header class="profile-drawer__header">
        <h2>{{ mode === 'profile' ? '编辑个人资料' : '修改心情' }}</h2>
        <button type="button" class="profile-drawer__close" aria-label="关闭" @click="emit('close')">✕</button>
      </header>

      <form v-if="mode === 'profile'" class="profile-drawer__form" @submit.prevent="submitProfile">
        <label>
          <span>昵称</span>
          <input v-model.trim="profileForm.nickname" type="text" placeholder="输入昵称" maxlength="30" />
        </label>

        <label>
          <span>出生日期</span>
          <input v-model="profileForm.birthday" type="date" />
        </label>

        <label>
          <span>性别（自定义）</span>
          <input v-model.trim="profileForm.gender" type="text" placeholder="如：沃尔玛购物袋" maxlength="20" />
        </label>

        <label>
          <span>当前城市</span>
          <input v-model.trim="profileForm.city" type="text" placeholder="如：赛博朋克城" maxlength="30" />
        </label>

        <div class="profile-drawer__actions">
          <button type="button" class="profile-drawer__cancel" :disabled="submitting" @click="emit('close')">
            取消
          </button>
          <button type="submit" class="profile-drawer__submit" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </form>

      <form v-else class="profile-drawer__form" @submit.prevent="submitStatus">
        <label>
          <span>状态心情</span>
          <input v-model.trim="statusText" type="text" placeholder="如：纯粹摸鱼中 🐟" maxlength="50" />
        </label>

        <!-- 预设心情快捷选择 -->
        <div class="status-presets">
          <button
            v-for="preset in statusPresets"
            :key="preset"
            type="button"
            class="status-presets__chip"
            :class="{ 'is-active': statusText === preset }"
            @click="statusText = preset"
          >
            {{ preset }}
          </button>
        </div>

        <div class="profile-drawer__actions">
          <button type="button" class="profile-drawer__cancel" :disabled="submitting" @click="emit('close')">
            取消
          </button>
          <button type="submit" class="profile-drawer__submit" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </form>
    </aside>
  </Transition>
</template>

<style scoped>
.profile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1000;
  width: min(35%, 420px);
  height: 100%;
  padding: 28px 26px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(0, 240, 255, 0.04), transparent 22%),
    linear-gradient(0deg, rgba(255, 45, 85, 0.04), transparent 26%),
    var(--panel-strong);
  box-shadow: -24px 0 80px rgba(0, 0, 0, 0.45);
  overflow-y: auto;
}

.profile-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.profile-drawer__header h2 {
  font-size: 16px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-drawer__close {
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

.profile-drawer__close:hover {
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.2);
}

.profile-drawer__form {
  display: grid;
  gap: 16px;
}

.profile-drawer__form label {
  display: grid;
  gap: 8px;
}

.profile-drawer__form label span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.profile-drawer__form input {
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.profile-drawer__form input:focus {
  border-color: rgba(0, 240, 255, 0.7);
  box-shadow: 0 0 0 4px rgba(0, 240, 255, 0.12);
}

/* --- 预设心情标签 --- */
.status-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-presets__chip {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 228, 92, 0.25);
  background: rgba(255, 228, 92, 0.06);
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.status-presets__chip:hover {
  color: var(--text);
  border-color: rgba(255, 228, 92, 0.6);
  background: rgba(255, 228, 92, 0.14);
}

.status-presets__chip.is-active {
  color: #081017;
  font-weight: 700;
  background: linear-gradient(90deg, var(--yellow), #ffd76e);
  border-color: transparent;
}

.profile-drawer__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.profile-drawer__cancel {
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.profile-drawer__cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}

.profile-drawer__submit {
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

.profile-drawer__submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.profile-drawer__cancel:disabled,
.profile-drawer__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- 抽屉滑入动画 --- */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.28s ease, opacity 0.28s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 720px) {
  .profile-drawer {
    width: 100%;
    border-left: none;
  }
}
</style>