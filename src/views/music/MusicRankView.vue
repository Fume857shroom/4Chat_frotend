<script setup lang="ts">
import ShareFeed from '../../components/music/ShareFeed.vue'
import MonthChart from '../../components/music/MonthChart.vue'

// 左：时间序分享流；右：月度排行。两块各自从 share store 取数
</script>

<template>
  <div class="music-rank">
    <div class="music-rank__feed">
      <ShareFeed />
    </div>
    <div class="music-rank__chart">
      <MonthChart />
    </div>
  </div>
</template>

<style scoped>
.music-rank {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(280px, 3fr);
  gap: 20px;
  height: 100%;
  min-height: 0;
}

.music-rank__feed,
.music-rank__chart {
  min-width: 0;
  min-height: 0;
}

.music-rank__feed > *,
.music-rank__chart > * {
  height: 100%;
}

@media (max-width: 1100px) {
  .music-rank {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .music-rank__feed > *,
  .music-rank__chart > * {
    height: auto;
    min-height: 320px;
  }
}
</style>
