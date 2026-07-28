<script setup lang="ts">
defineProps<{
  title: string
  accent: string
}>()
</script>

<template>
  <section class="info-panel" :style="{ '--panel-accent': accent }">
    <header class="info-panel__header">
      <span class="info-panel__dot"></span>
      <h2>{{ title }}</h2>
    </header>
    <div class="info-panel__body">
      <slot />
    </div>
  </section>
</template>
