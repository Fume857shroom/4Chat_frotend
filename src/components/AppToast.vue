<script setup lang="ts">
import { useToast } from '../composables/toast'

const { visible, message } = useToast()
</script>

<template>
  <Teleport to="body">
    <transition name="toast-fade">
      <div v-if="visible" class="app-toast">
        {{ message }}
      </div>
    </transition>
  </Teleport>
</template>