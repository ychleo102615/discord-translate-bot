<script setup lang="ts">
interface Strategy {
  id: string;
  guild_id: string;
  name: string;
  pool_id: string;
  filter: string;
  distribution: string;
  consumable: number;
  created_at: number;
}

interface Pool {
  id: string;
  name: string;
}

const guildId = inject<Ref<string>>('guildId')!;
const api = useApi();

const strategies = ref<Strategy[]>([]);
const pools = ref<Pool[]>([]);
const loading = ref(true);
const error = ref('');

const showCreateForm = ref(false);
const creating = ref(false);
const form = ref({
  name: '',
  poolId: '',
  distribution: 'randomUnique',
  consumable: true,
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [s, p] = await Promise.all([
      api.get<Strategy[]>(`/api/guilds/${guildId.value}/draw/strategies`),
      api.get<Pool[]>(`/api/guilds/${guildId.value}/draw/pools`),
    ]);
    strategies.value = s;
    pools.value = p;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入失敗';
  } finally {
    loading.value = false;
  }
}

async function createStrategy() {
  const name = form.value.name.trim();
  if (!name || !form.value.poolId) return;

  creating.value = true;
  error.value = '';
  try {
    await api.post(`/api/guilds/${guildId.value}/draw/strategies`, {
      name,
      poolId: form.value.poolId,
      filter: [],
      distribution: form.value.distribution,
      consumable: form.value.consumable,
    });
    form.value = { name: '', poolId: '', distribution: 'randomUnique', consumable: true };
    showCreateForm.value = false;
    await loadData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '建立失敗';
  } finally {
    creating.value = false;
  }
}

async function deleteStrategy(id: string) {
  error.value = '';
  try {
    await api.del(`/api/guilds/${guildId.value}/draw/strategies/${id}`);
    await loadData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '刪除失敗';
  }
}

function getPoolName(poolId: string): string {
  return pools.value.find(p => p.id === poolId)?.name ?? '(未知池)';
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-TW');
}
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <NuxtLink :to="`/guilds/${guildId}/draw`" class="back-link">&larr; 返回物品池列表</NuxtLink>
      <h1>策略管理</h1>
      <div class="header-actions">
        <NuxtLink :to="`/guilds/${guildId}/draw/history`" class="nav-link">抽選歷史</NuxtLink>
      </div>
    </header>

    <div v-if="loading" class="status-message">載入中...</div>
    <div v-else-if="error" class="status-message error">{{ error }}</div>

    <div v-else>
      <div class="section-header">
        <h2>策略 ({{ strategies.length }})</h2>
        <button class="btn btn-primary" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? '取消' : '新增策略' }}
        </button>
      </div>

      <div v-if="showCreateForm" class="create-form">
        <div class="form-group">
          <label>策略名稱</label>
          <input v-model="form.name" type="text" placeholder="例如：每輪抽一把武器" class="input" />
        </div>
        <div class="form-group">
          <label>關聯物品池</label>
          <select v-model="form.poolId" class="input">
            <option value="" disabled>選擇物品池</option>
            <option v-for="pool in pools" :key="pool.id" :value="pool.id">{{ pool.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>分配方式</label>
          <select v-model="form.distribution" class="input">
            <option value="randomUnique">隨機不重複</option>
          </select>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="form.consumable" type="checkbox" />
            消耗模式（抽到後移出池子）
          </label>
        </div>
        <button class="btn btn-primary" :disabled="creating" @click="createStrategy">
          {{ creating ? '建立中...' : '建立' }}
        </button>
      </div>

      <div v-if="strategies.length === 0 && !showCreateForm" class="empty-state">
        尚無策略，請先建立物品池，再新增策略。
      </div>

      <div class="strategy-list">
        <div v-for="strategy in strategies" :key="strategy.id" class="strategy-card">
          <div class="strategy-info">
            <NuxtLink
              :to="`/guilds/${guildId}/draw/strategies/${strategy.id}`"
              class="strategy-name"
            >
              {{ strategy.name }}
            </NuxtLink>
            <div class="strategy-meta">
              <span class="tag">{{ getPoolName(strategy.pool_id) }}</span>
              <span class="tag">{{ strategy.distribution }}</span>
              <span class="tag">{{ strategy.consumable ? '消耗' : '不消耗' }}</span>
              <span class="date">{{ formatDate(strategy.created_at) }}</span>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" @click="deleteStrategy(strategy.id)">刪除</button>
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
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #b5bac1;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  background: #2b2d31;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #fff;
  background: #35373c;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
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

.create-form {
  background: #2b2d31;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: #b5bac1;
}

.input {
  background: #1e1f22;
  border: 1px solid #3f4147;
  color: #fff;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #5865f2;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #5865f2;
}

.btn {
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #5865f2;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #4752c4;
}

.btn-danger {
  background: #ed4245;
  color: #fff;
}

.btn-danger:hover {
  background: #d83c3e;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.strategy-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #2b2d31;
  border-radius: 8px;
  transition: background 0.2s;
}

.strategy-card:hover {
  background: #313338;
}

.strategy-info {
  flex: 1;
}

.strategy-name {
  font-weight: 600;
  font-size: 1.05rem;
  color: #5865f2;
  text-decoration: none;
}

.strategy-name:hover {
  text-decoration: underline;
}

.strategy-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.4rem;
  font-size: 0.8rem;
  flex-wrap: wrap;
}

.tag {
  background: #1e1f22;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  color: #b5bac1;
}

.date {
  color: #6d6f78;
}
</style>
