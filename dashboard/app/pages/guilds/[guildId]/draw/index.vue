<script setup lang="ts">
interface Pool {
  id: string;
  guild_id: string;
  name: string;
  schema: string;
  created_at: number;
}

const guildId = inject<Ref<string>>('guildId')!;
const api = useApi();

const pools = ref<Pool[]>([]);
const loading = ref(true);
const error = ref('');

const showCreateForm = ref(false);
const newPoolName = ref('');
const schemaFields = ref<Array<{ name: string; type: 'text' | 'number' }>>([
  { name: '', type: 'text' },
]);
const creating = ref(false);

onMounted(async () => {
  await loadPools();
});

async function loadPools() {
  loading.value = true;
  error.value = '';
  try {
    pools.value = await api.get<Pool[]>(`/api/guilds/${guildId.value}/draw/pools`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入失敗';
  } finally {
    loading.value = false;
  }
}

function addSchemaField() {
  schemaFields.value.push({ name: '', type: 'text' });
}

function removeSchemaField(index: number) {
  schemaFields.value.splice(index, 1);
}

async function createPool() {
  const name = newPoolName.value.trim();
  const schema = schemaFields.value.filter(f => f.name.trim());
  if (!name || schema.length === 0) return;

  creating.value = true;
  try {
    await api.post(`/api/guilds/${guildId.value}/draw/pools`, {
      name,
      schema: schema.map(f => ({ name: f.name.trim(), type: f.type })),
    });
    newPoolName.value = '';
    schemaFields.value = [{ name: '', type: 'text' }];
    showCreateForm.value = false;
    await loadPools();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '建立失敗';
  } finally {
    creating.value = false;
  }
}

async function deletePool(poolId: string) {
  try {
    await api.del(`/api/guilds/${guildId.value}/draw/pools/${poolId}`);
    await loadPools();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '刪除失敗';
  }
}

function parseSchema(schemaJson: string): Array<{ name: string; type: string }> {
  try {
    return JSON.parse(schemaJson);
  } catch {
    return [];
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-TW');
}
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="breadcrumb">
        <NuxtLink :to="`/guilds/${guildId}`" class="back-link">&larr; 返回</NuxtLink>
      </div>
      <h1>物品池管理</h1>
      <div class="header-actions">
        <NuxtLink :to="`/guilds/${guildId}/draw/strategies`" class="nav-link">策略管理</NuxtLink>
        <NuxtLink :to="`/guilds/${guildId}/draw/history`" class="nav-link">抽選歷史</NuxtLink>
      </div>
    </header>

    <div v-if="loading" class="status-message">載入中...</div>
    <div v-else-if="error" class="status-message error">{{ error }}</div>

    <div v-else>
      <div class="section-header">
        <h2>物品池 ({{ pools.length }})</h2>
        <button class="btn btn-primary" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? '取消' : '新增物品池' }}
        </button>
      </div>

      <div v-if="showCreateForm" class="create-form">
        <div class="form-group">
          <label>池名稱</label>
          <input v-model="newPoolName" type="text" placeholder="例如：武器池" class="input" />
        </div>
        <div class="form-group">
          <label>Schema 欄位</label>
          <div v-for="(field, i) in schemaFields" :key="i" class="schema-row">
            <input v-model="field.name" type="text" placeholder="欄位名稱" class="input input-sm" />
            <select v-model="field.type" class="input input-sm">
              <option value="text">文字</option>
              <option value="number">數字</option>
            </select>
            <button v-if="schemaFields.length > 1" class="btn btn-danger btn-sm" @click="removeSchemaField(i)">
              &times;
            </button>
          </div>
          <button class="btn btn-secondary btn-sm" @click="addSchemaField">+ 新增欄位</button>
        </div>
        <button class="btn btn-primary" :disabled="creating" @click="createPool">
          {{ creating ? '建立中...' : '建立' }}
        </button>
      </div>

      <div v-if="pools.length === 0 && !showCreateForm" class="empty-state">
        尚無物品池，點擊「新增物品池」開始建立。
      </div>

      <div class="pool-list">
        <div v-for="pool in pools" :key="pool.id" class="pool-card">
          <div class="pool-info">
            <NuxtLink :to="`/guilds/${guildId}/draw/pools/${pool.id}`" class="pool-name">
              {{ pool.name }}
            </NuxtLink>
            <div class="pool-meta">
              <span class="schema-tags">
                <span v-for="field in parseSchema(pool.schema)" :key="field.name" class="tag">
                  {{ field.name }} ({{ field.type }})
                </span>
              </span>
              <span class="date">{{ formatDate(pool.created_at) }}</span>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" @click="deletePool(pool.id)">刪除</button>
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

.breadcrumb {
  margin-bottom: 0.5rem;
}

.back-link {
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

.input-sm {
  width: auto;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
}

.schema-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.schema-row .input:first-child {
  flex: 1;
}

.schema-row select {
  width: 100px;
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

.btn-secondary {
  background: #3f4147;
  color: #b5bac1;
}

.btn-secondary:hover {
  background: #4e5058;
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

.pool-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pool-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #2b2d31;
  border-radius: 8px;
  transition: background 0.2s;
}

.pool-card:hover {
  background: #313338;
}

.pool-info {
  flex: 1;
}

.pool-name {
  font-weight: 600;
  font-size: 1.05rem;
  color: #5865f2;
  text-decoration: none;
}

.pool-name:hover {
  text-decoration: underline;
}

.pool-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.4rem;
  font-size: 0.8rem;
}

.schema-tags {
  display: flex;
  gap: 0.3rem;
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
