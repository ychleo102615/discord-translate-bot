<script setup lang="ts">
interface SchemaField {
  name: string;
  type: 'text' | 'number';
}

interface Pool {
  id: string;
  guild_id: string;
  name: string;
  schema: string;
  created_at: number;
}

interface PoolItem {
  id: string;
  pool_id: string;
  data: string;
  created_at: number;
}

const route = useRoute();
const guildId = inject<Ref<string>>('guildId')!;
const poolId = computed(() => route.params.poolId as string);
const api = useApi();

const pool = ref<Pool | null>(null);
const items = ref<PoolItem[]>([]);
const schema = ref<SchemaField[]>([]);
const loading = ref(true);
const error = ref('');

const showAddForm = ref(false);
const newItemData = ref<Record<string, string | number>>({});
const adding = ref(false);

const editingItemId = ref<string | null>(null);
const editItemData = ref<Record<string, string | number>>({});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [poolRes, itemsRes] = await Promise.all([
      api.get<Pool>(`/api/guilds/${guildId.value}/draw/pools/${poolId.value}`),
      api.get<PoolItem[]>(`/api/guilds/${guildId.value}/draw/pools/${poolId.value}/items`),
    ]);
    pool.value = poolRes;
    items.value = itemsRes;
    schema.value = JSON.parse(poolRes.schema) as SchemaField[];
    resetNewItem();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入失敗';
  } finally {
    loading.value = false;
  }
}

function resetNewItem() {
  const data: Record<string, string | number> = {};
  for (const field of schema.value) {
    data[field.name] = field.type === 'number' ? 0 : '';
  }
  newItemData.value = data;
}

async function addItem() {
  adding.value = true;
  error.value = '';
  try {
    await api.post(`/api/guilds/${guildId.value}/draw/pools/${poolId.value}/items`, {
      data: newItemData.value,
    });
    showAddForm.value = false;
    resetNewItem();
    await loadData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '新增失敗';
  } finally {
    adding.value = false;
  }
}

function startEdit(item: PoolItem) {
  editingItemId.value = item.id;
  editItemData.value = { ...JSON.parse(item.data) };
}

function cancelEdit() {
  editingItemId.value = null;
  editItemData.value = {};
}

async function saveEdit(itemId: string) {
  error.value = '';
  try {
    await api.put(`/api/guilds/${guildId.value}/draw/pools/${poolId.value}/items/${itemId}`, {
      data: editItemData.value,
    });
    editingItemId.value = null;
    await loadData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '更新失敗';
  }
}

async function deleteItem(itemId: string) {
  error.value = '';
  try {
    await api.del(`/api/guilds/${guildId.value}/draw/pools/${poolId.value}/items/${itemId}`);
    await loadData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '刪除失敗';
  }
}

function parseItemData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson);
  } catch {
    return {};
  }
}
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <NuxtLink :to="`/guilds/${guildId}/draw`" class="back-link">&larr; 返回物品池列表</NuxtLink>
      <h1 v-if="pool">{{ pool.name }}</h1>
      <div v-if="schema.length" class="schema-display">
        Schema:
        <span v-for="field in schema" :key="field.name" class="tag">
          {{ field.name }} ({{ field.type }})
        </span>
      </div>
    </header>

    <div v-if="loading" class="status-message">載入中...</div>
    <div v-else-if="error" class="status-message error">{{ error }}</div>

    <div v-else>
      <div class="section-header">
        <h2>物品 ({{ items.length }})</h2>
        <button class="btn btn-primary" @click="showAddForm = !showAddForm">
          {{ showAddForm ? '取消' : '新增物品' }}
        </button>
      </div>

      <div v-if="showAddForm" class="create-form">
        <div v-for="field in schema" :key="field.name" class="form-group">
          <label>{{ field.name }}</label>
          <input
            v-if="field.type === 'text'"
            v-model="newItemData[field.name]"
            type="text"
            class="input"
          />
          <input
            v-else
            v-model.number="newItemData[field.name]"
            type="number"
            class="input"
          />
        </div>
        <button class="btn btn-primary" :disabled="adding" @click="addItem">
          {{ adding ? '新增中...' : '新增' }}
        </button>
      </div>

      <div v-if="items.length === 0 && !showAddForm" class="empty-state">
        尚無物品，點擊「新增物品」開始添加。
      </div>

      <div class="item-table-wrapper">
        <table v-if="items.length > 0" class="item-table">
          <thead>
            <tr>
              <th v-for="field in schema" :key="field.name">{{ field.name }}</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <template v-if="editingItemId === item.id">
                <td v-for="field in schema" :key="field.name">
                  <input
                    v-if="field.type === 'text'"
                    v-model="editItemData[field.name]"
                    type="text"
                    class="input input-sm"
                  />
                  <input
                    v-else
                    v-model.number="editItemData[field.name]"
                    type="number"
                    class="input input-sm"
                  />
                </td>
                <td class="actions-col">
                  <button class="btn btn-primary btn-sm" @click="saveEdit(item.id)">儲存</button>
                  <button class="btn btn-secondary btn-sm" @click="cancelEdit">取消</button>
                </td>
              </template>
              <template v-else>
                <td v-for="field in schema" :key="field.name">
                  {{ parseItemData(item.data)[field.name] ?? '' }}
                </td>
                <td class="actions-col">
                  <button class="btn btn-secondary btn-sm" @click="startEdit(item)">編輯</button>
                  <button class="btn btn-danger btn-sm" @click="deleteItem(item.id)">刪除</button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
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
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

.schema-display {
  font-size: 0.85rem;
  color: #b5bac1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.tag {
  background: #2b2d31;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  color: #b5bac1;
  font-size: 0.8rem;
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
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
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

.item-table-wrapper {
  overflow-x: auto;
}

.item-table {
  width: 100%;
  border-collapse: collapse;
  background: #2b2d31;
  border-radius: 8px;
  overflow: hidden;
}

.item-table th,
.item-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #3f4147;
}

.item-table th {
  background: #1e1f22;
  color: #b5bac1;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
}

.item-table tbody tr:hover {
  background: #313338;
}

.actions-col {
  width: 150px;
  white-space: nowrap;
}

.actions-col .btn + .btn {
  margin-left: 0.3rem;
}
</style>
