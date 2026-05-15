<script setup lang="ts">
import { onMounted, ref } from "vue"

type Drama = {
  id: string
  title: string
  url?: string
  source?: string
  cover?: string
}

const DRAMAS_KEY = "dramas"
const dramas = ref<Drama[]>([])

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.local
}

function loadDramas(): void {
  if (!hasChromeStorage()) return
  chrome.storage.local.get(DRAMAS_KEY, (result) => {
    dramas.value = (result[DRAMAS_KEY] as Drama[] | undefined) || []
  })
}

onMounted(() => {
  loadDramas()
  if (!hasChromeStorage()) return
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[DRAMAS_KEY]) return
    dramas.value = (changes[DRAMAS_KEY].newValue as Drama[] | undefined) || []
  })
})
</script>

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
      <p v-if="dramas.length === 0" class="panel__desc">还没有加入任何剧。</p>
      <ul v-else class="drama-list">
        <li v-for="drama in dramas" :key="drama.id" class="drama-item">
          <a v-if="drama.url" :href="drama.url" target="_blank" rel="noopener" class="drama-link">
            {{ drama.title }}
          </a>
          <span v-else class="drama-title">{{ drama.title }}</span>
          <span v-if="drama.source" class="drama-source">{{ drama.source }}</span>
        </li>
      </ul>
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

.drama-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.drama-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.drama-link {
  color: #111827;
  text-decoration: none;
  flex: 1;
}

.drama-link:hover {
  text-decoration: underline;
}

.drama-title {
  color: #111827;
  flex: 1;
}

.drama-source {
  color: #9ca3af;
  font-size: 11px;
  white-space: nowrap;
}
</style>
