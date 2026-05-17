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
const activeTab = ref<"recommend" | "review">("recommend");

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

function removeDrama(id: string): void {
  const next = dramas.value.filter((item) => item.id !== id);
  dramas.value = next;
  if (chrome?.storage?.local) {
    chrome.storage.local.set({ [DRAMAS_KEY]: next });
  }
}
</script>

<template>
  <main class="popup">
    <nav class="nav">
      <div class="nav__title">追剧小能手</div>
      <div class="nav__tabs">
        <button
          class="nav__tab"
          :class="{ 'nav__tab--active': activeTab === 'recommend' }"
          type="button"
          @click="activeTab = 'recommend'"
        >
          新剧推荐
        </button>
        <button
          class="nav__tab"
          :class="{ 'nav__tab--active': activeTab === 'review' }"
          type="button"
          @click="activeTab = 'review'"
        >
          好剧回顾
        </button>
      </div>
    </nav>

    <section class="content">
      <div v-if="activeTab === 'recommend'" class="panel">
        <h2 class="panel__title">新剧推荐</h2>
        <p class="panel__desc">这里将展示符合你喜好的新剧（MVP 占位）。</p>
        <p class="panel__hint">MVP 版本：先跑起来，再慢慢变聪明</p>
      </div>

      <div v-else class="panel">
        <h2 class="panel__title">好剧回顾</h2>
        <p v-if="isLoading" class="panel__desc">加载中...</p>
        <p v-else-if="dramas.length === 0" class="panel__desc">
          还没有加入任何剧
        </p>
        <ul v-else class="drama-grid">
          <li v-for="drama in dramas" :key="drama.id" class="drama-card">
            <div class="drama-card__body">
              <a
                v-if="drama.url"
                class="drama-title"
                :href="drama.url"
                target="_blank"
                rel="noreferrer"
              >
                {{ drama.title }}
              </a>
              <span v-else class="drama-title">{{ drama.title }}</span>
              <span class="drama-source">{{ drama.source || "未知来源" }}</span>
            </div>
            <button
              class="drama-delete"
              type="button"
              aria-label="删除"
              title="删除"
              @click="removeDrama(drama.id)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
.popup {
  width: 420px;
  height: 400px;
  padding: 16px;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.nav__title {
  font-size: 16px;
  font-weight: 600;
}

.nav__tabs {
  display: flex;
  gap: 6px;
}

.nav__tab {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #4b5563;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
}

.nav__tab--active {
  background: #111827;
  color: #f9fafb;
  border-color: #111827;
}

.content {
  flex: 1;
  overflow: auto;
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

.panel__hint {
  margin: 8px 0 0 0;
  font-size: 11px;
  color: #9ca3af;
}

.drama-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  font-size: 12px;
}

.drama-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.drama-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.drama-title {
  color: #1f2937;
  text-decoration: none;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drama-title:hover {
  text-decoration: underline;
}

.drama-source {
  color: #9ca3af;
  font-size: 11px;
}

.drama-delete {
  border: none;
  background: transparent;
  color: #9ca3af;
  padding: 2px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.drama-delete:hover {
  color: #ef4444;
}

.drama-delete svg {
  width: 14px;
  height: 14px;
}
</style>
