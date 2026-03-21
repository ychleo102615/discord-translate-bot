<script setup lang="ts">
interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt';
  value: string | number | string[];
}

interface SchemaField {
  name: string;
  type: 'text' | 'number';
}

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
  schema: string;
}

const OPERATORS = [
  { value: 'eq', label: '等於 (=)' },
  { value: 'neq', label: '不等於 (!=)' },
  { value: 'in', label: '包含於 (in)' },
  { value: 'gte', label: '大於等於 (>=)' },
  { value: 'lte', label: '小於等於 (<=)' },
  { value: 'gt', label: '大於 (>)' },
  { value: 'lt', label: '小於 (<)' },
] as const;

const route = useRoute();
const guildId = inject<Ref<string>>('guildId')!;
const strategyId = computed(() => route.params.strategyId as string);
const api = useApi();

const strategy = ref<Strategy | null>(null);
const pool = ref<Pool | null>(null);
const schema = ref<SchemaField[]>([]);
const filters = ref<FilterCondition[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const successMsg = ref('');

const editName = ref('');
const editDistribution = ref('randomUnique');
const editConsumable = ref(true);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const s = await api.get<Strategy>(`/api/guilds/${guildId.value}/draw/strategies/${strategyId.value}`);
    strategy.value = s;
    editName.value = s.name;
    editDistribution.value = s.distribution;
    editConsumable.value = s.consumable === 1;
    filters.value = JSON.parse(s.filter) as FilterCondition[];

    const p = await api.get<Pool>(`/api/guilds/${guildId.value}/draw/pools/${s.pool_id}`);
    pool.value = p;
    schema.value = JSON.parse(p.schema) as SchemaField[];
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入失敗';
  } finally {
    loading.value = false;
  }
}

function addFilter() {
  const firstField = schema.value[0]?.name ?? '';
  filters.value.push({ field: firstField, operator: 'eq', value: '' });
}

function removeFilter(index: number) {
  filters.value.splice(index, 1);
}

function getFilterValueDisplay(filter: FilterCondition): string {
  if (filter.operator === 'in' && Array.isArray(filter.value)) {
    return filter.value.join(', ');
  }
  return String(filter.value);
}

function setFilterValue(index: number, raw: string) {
  const filter = filters.value[index] as FilterCondition | undefined;
  if (!filter) return;
  if (filter.operator === 'in') {
    filter.value = raw.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    const fieldDef = schema.value.find(f => f.name === filter.field);
    filter.value = fieldDef?.type === 'number' ? Number(raw) || 0 : raw;
  }
}

async function save() {
  saving.value = true;
  error.value = '';
  successMsg.value = '';
  try {
    await api.put(`/api/guilds/${guildId.value}/draw/strategies/${strategyId.value}`, {
      name: editName.value.trim(),
      filter: filters.value,
      distribution: editDistribution.value,
      consumable: editConsumable.value,
    });
    successMsg.value = '儲存成功';
    setTimeout(() => { successMsg.value = ''; }, 2000);
    await loadData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '儲存失敗';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <NuxtLink :to="`/guilds/${guildId}/draw/strategies`" class="back-link">
        &larr; 返回策略列表
      </NuxtLink>
      <h1>編輯策略</h1>
    </header>

    <div v-if="loading" class="status-message">載入中...</div>
    <div v-else-if="error" class="status-message error">{{ error }}</div>

    <div v-else-if="strategy" class="edit-form">
      <div class="form-group">
        <label>策略名稱</label>
        <input v-model="editName" type="text" class="input" />
      </div>

      <div class="form-group">
        <label>關聯物品池</label>
        <div class="readonly-value">{{ pool?.name ?? strategy.pool_id }}</div>
      </div>

      <div class="form-group">
        <label>分配方式</label>
        <select v-model="editDistribution" class="input">
          <option value="randomUnique">隨機不重複</option>
        </select>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input v-model="editConsumable" type="checkbox" />
          消耗模式（抽到後移出池子）
        </label>
      </div>

      <div class="form-group">
        <div class="filter-header">
          <label>篩選條件</label>
          <button class="btn btn-secondary btn-sm" @click="addFilter">+ 新增條件</button>
        </div>

        <div v-if="filters.length === 0" class="filter-empty">
          無篩選條件（使用全部物品）
        </div>

        <div v-for="(filter, i) in filters" :key="i" class="filter-row">
          <select v-model="filter.field" class="input input-sm">
            <option v-for="field in schema" :key="field.name" :value="field.name">
              {{ field.name }}
            </option>
          </select>
          <select v-model="filter.operator" class="input input-sm">
            <option v-for="op in OPERATORS" :key="op.value" :value="op.value">
              {{ op.label }}
            </option>
          </select>
          <input
            :value="getFilterValueDisplay(filter)"
            type="text"
            class="input input-sm filter-value"
            :placeholder="filter.operator === 'in' ? '用逗號分隔' : '值'"
            @input="setFilterValue(i, ($event.target as HTMLInputElement).value)"
          />
          <button class="btn btn-danger btn-sm" @click="removeFilter(i)">&times;</button>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '儲存中...' : '儲存變更' }}
        </button>
        <span v-if="successMsg" class="success-msg">{{ successMsg }}</span>
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

.edit-form {
  background: #2b2d31;
  border-radius: 8px;
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
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

.readonly-value {
  color: #b5bac1;
  font-size: 0.95rem;
  padding: 0.5rem 0;
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

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.filter-header label {
  margin-bottom: 0;
}

.filter-empty {
  color: #6d6f78;
  font-size: 0.9rem;
  padding: 0.5rem 0;
}

.filter-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.filter-row select:first-child {
  width: 140px;
}

.filter-row select:nth-child(2) {
  width: 160px;
}

.filter-value {
  flex: 1;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.success-msg {
  color: #3ba55c;
  font-size: 0.9rem;
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
</style>
