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
