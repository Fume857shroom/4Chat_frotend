// ==========================================
// src/stores/user.ts
// 个人中心状态管理
// ==========================================
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserProfile, UpdateProfileDTO } from '../types/user'
import {
  fetchUserProfile as apiFetchUserProfile,
  updateProfile as apiUpdateProfile,
  updateStatus as apiUpdateStatus,
  uploadAvatar as apiUploadAvatar,
} from '../api/user/profile'

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile | null>(null)
  const isUploadingAvatar = ref(false)
  const isSavingProfile = ref(false)

  async function fetchUserProfile() {
    profile.value = await apiFetchUserProfile()
  }

  async function updateProfile(data: UpdateProfileDTO) {
    isSavingProfile.value = true
    try {
      await apiUpdateProfile(data)
      if (profile.value) {
        profile.value = { ...profile.value, ...data }
      }
    } finally {
      isSavingProfile.value = false
    }
  }

  async function updateStatus(status: string) {
    await apiUpdateStatus({ status })
    if (profile.value) {
      profile.value = { ...profile.value, status }
    }
  }

  async function uploadAvatar(file: Blob) {
    isUploadingAvatar.value = true
    try {
      const { avatarUrl } = await apiUploadAvatar(file)
      if (profile.value) {
        profile.value = { ...profile.value, avatar: avatarUrl }
      }
    } finally {
      isUploadingAvatar.value = false
    }
  }

  return {
    profile,
    isUploadingAvatar,
    isSavingProfile,
    fetchUserProfile,
    updateProfile,
    updateStatus,
    uploadAvatar,
  }
})
