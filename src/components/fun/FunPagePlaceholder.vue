<script setup lang="ts">
defineProps<{
  icon: string
  name: string
}>()
</script>

<template>
  <section class="fun-page">
    <header class="fun-page__head">
      <span class="fun-page__icon">{{ icon }}</span>
      <h1 class="fun-page__title">{{ name }}</h1>
      <p class="fun-page__tip">开发中，敬请期待</p>
    </header>
  </section>
</template>

<style scoped>
.fun-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(0, 240, 255, 0.05), transparent 40%),
    var(--panel-strong);
  overflow: hidden;
}

.fun-page__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.fun-page__icon {
  font-size: 56px;
  filter: grayscale(0.3);
}

.fun-page__title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.1em;
  background: linear-gradient(120deg, var(--cyan), var(--yellow));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.fun-page__tip {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.12em;
}
</style>
