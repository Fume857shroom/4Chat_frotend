<script setup lang="ts">
import axios from 'axios'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

type Mode = 'login' | 'register'

const router = useRouter()
const authStore = useAuthStore()
const mode = ref<Mode>('login')
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({
  username: '',
  password: '',
})

const title = computed(() =>
  mode.value === 'login' ? '回到 4Chat 控制台' : '创建你的 4Chat 账号',
)

async function handleSubmit() {
  errorMessage.value = ''

  if (!form.username || !form.password) {
    errorMessage.value = '请先填写用户名和密码。'
    return
  }

  loading.value = true

  try {
    if (mode.value === 'login') {
      await authStore.loginAction({
        username: form.username,
        password: form.password,
      })
    } else {
      await authStore.registerAction({
        username: form.username,
        password: form.password,
      })
    }

    await router.push('/chat')
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errorMessage.value =
        String(error.response?.data?.message || error.response?.data?.error || error.message) ||
        '请求失败，请稍后再试。'
    } else {
      errorMessage.value = '请求失败，请稍后再试。'
    }
  } finally {
    loading.value = false
  }
}

function switchMode(nextMode: Mode) {
  mode.value = nextMode
  errorMessage.value = ''
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-page__backdrop"></div>

    <div class="auth-card">
      <div class="auth-card__intro">
        <p class="eyebrow">ACCESS NODE</p>
        <h1>{{ title }}</h1>
        <p>
          前端仅负责提交和展示后端返回结果。登录与注册当前统一使用用户名和密码。
        </p>
      </div>

      <div class="auth-switch" role="tablist" aria-label="登录注册切换">
        <button
          type="button"
          :class="{ 'is-active': mode === 'login' }"
          @click="switchMode('login')"
        >
          登录
        </button>
        <button
          type="button"
          :class="{ 'is-active': mode === 'register' }"
          @click="switchMode('register')"
        >
          注册
        </button>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label>
          <span>用户名</span>
          <input v-model.trim="form.username" type="text" autocomplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="form.password" type="password" autocomplete="current-password" />
        </label>

        <p v-if="errorMessage" class="auth-form__error">{{ errorMessage }}</p>

        <button class="auth-form__submit" type="submit" :disabled="loading">
          {{ loading ? '提交中...' : mode === 'login' ? '进入系统' : '创建账号' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.eyebrow {
  font-size: 12px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--cyan);
}

.auth-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
}

.auth-page__backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(130deg, rgba(0, 240, 255, 0.12), transparent 42%),
    linear-gradient(310deg, rgba(255, 45, 85, 0.14), transparent 38%);
  filter: blur(24px);
}

.auth-card {
  position: relative;
  z-index: 1;
  width: min(100%, 540px);
  padding: 32px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    var(--panel);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.auth-card__intro {
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
}

.auth-card__intro h1 {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 48px);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.auth-card__intro p:last-child {
  color: var(--muted);
  line-height: 1.7;
}

.auth-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 24px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.auth-switch button {
  padding: 12px 20px;
  border-radius: 999px;
  color: var(--muted);
  background: transparent;
}

.auth-switch button.is-active {
  background: linear-gradient(90deg, var(--cyan), #62fff4);
  color: #03131a;
  font-weight: 700;
}

.auth-form {
  display: grid;
  gap: 16px;
}

.auth-form label {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

.auth-form__error {
  padding: 12px 14px;
  border-radius: 14px;
  color: #fff2f5;
  background: rgba(255, 45, 85, 0.12);
  border: 1px solid rgba(255, 45, 85, 0.24);
}

.auth-form__submit {
  background: linear-gradient(90deg, var(--pink), #ff7b54);
  color: white;
}

.auth-form__submit:disabled {
  cursor: wait;
  opacity: 0.7;
}

@media (max-width: 720px) {
  .auth-page {
    padding: 16px;
  }
}
</style>
