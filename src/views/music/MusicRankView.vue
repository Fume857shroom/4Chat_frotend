<script setup lang="ts">
import ShareFeed from '../../components/music/ShareFeed.vue'
import MonthChart from '../../components/music/MonthChart.vue'

// 左：月度排行（每行右侧带别人的留言条，点开看完整评分与留言）；右：时间序分享流。
// 排行占宽列是因为留言条要跟歌曲并排，窄列放不下第三格
</script>

<template>
  <div class="music-rank">
    <div class="music-rank__chart">
      <MonthChart />
    </div>
    <div class="music-rank__feed">
      <ShareFeed />
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
