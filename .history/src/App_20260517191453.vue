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
        <ul v-else class="review-grid">
          <li v-for="drama in dramas" :key="drama.id" class="review-card">
            <div class="review-cover">
              <img
                v-if="drama.cover"
                :src="drama.cover"
                :alt="drama.title"
                loading="lazy"
              />
              <div v-else class="review-cover__empty">暂无图片</div>
            </div>
            <div class="review-body">
              <div class="review-top">
                <div class="review-title">{{ drama.title }}</div>
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
              </div>
              <div class="review-meta">
                <span class="review-source">{{ drama.source || "未知来源" }}</span>
              </div>
              <a
                v-if="drama.url"
                class="review-action"
                :href="drama.url"
                target="_blank"
                rel="noreferrer"
              >
                立即观看
              </a>
            </div>
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

.review-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.review-card {
  display: flex;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.review-cover {
  width: 84px;
  height: 84px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  flex-shrink: 0;
}

.review-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.review-cover__empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #9ca3af;
}

.review-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.review-top {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.review-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-meta {
  font-size: 11px;
  color: #9ca3af;
}

.review-source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.review-action {
  align-self: flex-end;
  font-size: 12px;
  color: #0f766e;
  background: #e6fffb;
  border: 1px solid #99f6e4;
  border-radius: 999px;
  padding: 4px 10px;
  text-decoration: none;
}

.review-action:hover {
  background: #ccfbf1;
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
