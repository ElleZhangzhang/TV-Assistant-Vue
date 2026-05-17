<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

type StoredDrama = {
  id: string;
  title: string;
  url?: string;
  source?: string;
  cover?: string;
};

const DRAMAS_KEY = "dramas";

const dramas = ref<StoredDrama[]>([]);
const isLoading = ref(true);

function loadDramas(): void {
  if (!chrome?.storage?.local) {
    isLoading.value = false;
    return;
  }

  chrome.storage.local.get(DRAMAS_KEY, (result) => {
    dramas.value = (result[DRAMAS_KEY] as StoredDrama[] | undefined) || [];
    isLoading.value = false;
  });
}

function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
): void {
  if (areaName !== "local" || !changes[DRAMAS_KEY]) {
    return;
  }
  const next = changes[DRAMAS_KEY].newValue as StoredDrama[] | undefined;
  dramas.value = next || [];
}

onMounted(() => {
  loadDramas();
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener(handleStorageChange);
  }
});

onBeforeUnmount(() => {
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.removeListener(handleStorageChange);
  }
});
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
      <p v-if="isLoading" class="panel__desc">加载中...</p>
      <p v-else-if="dramas.length === 0" class="panel__desc">
        还没有加入任何剧
      </p>
      <ul v-else class="drama-list">
        <li v-for="drama in dramas" :key="drama.id" class="drama-item">
          <a
            v-if="drama.url"
            :href="drama.url"
            target="_blank"
            rel="noreferrer"
          >
            {{ drama.title }}
          </a>
          <span v-else>{{ drama.title }}</span>
          <span class="drama-source">{{ drama.source || "未知来源" }}</span>
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
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.drama-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
}

.drama-item a {
  color: #1f2937;
  text-decoration: none;
  flex: 1;
}

.drama-item a:hover {
  text-decoration: underline;
}

.drama-source {
  color: #9ca3af;
  font-size: 11px;
}
</style>
