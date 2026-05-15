<script setup lang="ts"></script>

<template>
  <main class="popup">
    <header class="popup__header">
      <h1 class="popup__title">追剧小能手</h1>
      <p class="popup__subtitle">MVP 版本：先跑起来，再慢慢变聪明</p>
    </header>

    <section class="panel">
      <h2 class="panel__title">新剧推荐</h2>
      <p class="panel__desc">这里将展示符合你喜好的新剧（MVP 占位）。</p>
    </section>

    <section class="panel">
      <h2 class="panel__title">好剧回顾</h2>
      <p class="panel__desc">这里将展示你看过的剧（MVP 占位）。</p>
    </section>
  </main>
</template>

<style scoped>
.popup {
  width: 320px;
  padding: 16px;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  color: #2c3e50;
}

.popup__header {
  margin-bottom: 16px;
}

.popup__title {
  margin: 0 0 4px 0;
  font-size: 18px;
}

.popup__subtitle {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fafafa;
}

.panel__title {
  margin: 0 0 6px 0;
  font-size: 14px;
}

.panel__desc {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}
</style>
