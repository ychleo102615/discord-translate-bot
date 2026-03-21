<script setup lang="ts">
interface Session {
  id: string;
  guild_id: string;
  strategy_id: string;
  status: string;
  created_at: number;
}

interface HistoryEntry {
  id: string;
  session_id: string;
  user_id: string;
  session_item_id: string;
  round: number;
  created_at: number;
}

const guildId = inject<Ref<string>>('guildId')!;
const api = useApi();

const sessions = ref<Session[]>([]);
const loading = ref(true);
const error = ref('');

const selectedSessionId = ref<string | null>(null);
const history = ref<HistoryEntry[]>([]);
const loadingHistory = ref(false);

onMounted(async () => {
  await loadSessions();
});

async function loadSessions() {
  loading.value = true;
  error.value = '';
  try {
    sessions.value = await api.get<Session[]>(`/api/guilds/${guildId.value}/draw/sessions`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入失敗';
  } finally {
    loading.value = false;
  }
}

async function selectSession(sessionId: string) {
  if (selectedSessionId.value === sessionId) {
    selectedSessionId.value = null;
    history.value = [];
    return;
  }

  selectedSessionId.value = sessionId;
  loadingHistory.value = true;
  try {
    history.value = await api.get<HistoryEntry[]>(
      `/api/guilds/${guildId.value}/draw/sessions/${sessionId}/history`,
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入歷史失敗';
  } finally {
    loadingHistory.value = false;
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-TW');
}

function groupByRound(entries: HistoryEntry[]): Map<number, HistoryEntry[]> {
  const map = new Map<number, HistoryEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.round) ?? [];
    list.push(entry);
    map.set(entry.round, list);
  }
  return map;
}
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <NuxtLink :to="`/guilds/${guildId}/draw`" class="back-link">&larr; 返回物品池列表</NuxtLink>
      <h1>抽選歷史</h1>
    </header>

    <div v-if="loading" class="status-message">載入中...</div>
    <div v-else-if="error" class="status-message error">{{ error }}</div>

    <div v-else>
      <div v-if="sessions.length === 0" class="empty-state">
        尚無抽選紀錄。
      </div>

      <div class="session-list">
        <div v-for="session in sessions" :key="session.id" class="session-item">
          <div
            class="session-header"
            :class="{ active: selectedSessionId === session.id }"
            @click="selectSession(session.id)"
          >
            <div class="session-info">
              <span class="session-id">{{ session.id.slice(0, 8) }}...</span>
              <span :class="['status-badge', session.status]">{{ session.status }}</span>
            </div>
            <span class="session-date">{{ formatDate(session.created_at) }}</span>
          </div>

          <div v-if="selectedSessionId === session.id" class="session-detail">
            <div v-if="loadingHistory" class="detail-loading">載入中...</div>
            <div v-else-if="history.length === 0" class="detail-empty">此 session 尚無紀錄。</div>
            <div v-else>
              <div v-for="[round, entries] in groupByRound(history)" :key="round" class="round-group">
                <h3>Round {{ round }}</h3>
                <div v-for="entry in entries" :key="entry.id" class="history-entry">
                  <span class="user-id">{{ entry.user_id }}</span>
                  <span class="arrow">&rarr;</span>
                  <span class="item-id">{{ entry.session_item_id.slice(0, 8) }}...</span>
                  <span class="entry-date">{{ formatDate(entry.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #1e1f22;
  color: #fff;
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 1.5rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 0.5rem;
  color: #5865f2;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  text-decoration: underline;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.status-message {
  text-align: center;
  color: #b5bac1;
  margin-top: 3rem;
}

.status-message.error {
  color: #ed4245;
}

.empty-state {
  text-align: center;
  color: #b5bac1;
  padding: 3rem 1rem;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #2b2d31;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.session-header:hover,
.session-header.active {
  background: #35373c;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.session-id {
  font-family: monospace;
  font-size: 0.95rem;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
}

.status-badge.active {
  background: #3ba55c33;
  color: #3ba55c;
}

.status-badge.closed {
  background: #6d6f7833;
  color: #6d6f78;
}

.session-date {
  color: #6d6f78;
  font-size: 0.85rem;
}

.session-detail {
  background: #2b2d31;
  border-radius: 0 0 8px 8px;
  padding: 1rem;
  margin-top: -0.25rem;
}

.detail-loading,
.detail-empty {
  color: #b5bac1;
  font-size: 0.9rem;
}

.round-group {
  margin-bottom: 1rem;
}

.round-group:last-child {
  margin-bottom: 0;
}

.round-group h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: #b5bac1;
}

.history-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  font-size: 0.9rem;
}

.user-id {
  font-family: monospace;
  color: #5865f2;
}

.arrow {
  color: #6d6f78;
}

.item-id {
  font-family: monospace;
  color: #b5bac1;
}

.entry-date {
  color: #6d6f78;
  font-size: 0.8rem;
  margin-left: auto;
}
</style>
