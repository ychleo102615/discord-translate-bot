export interface SchemaField {
  name: string;
  type: 'text' | 'number';
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt';
  value: string | number | string[];
}

// Row types matching DB schema

export interface PoolRow {
  id: string;
  guild_id: string;
  name: string;
  schema: string; // JSON string of SchemaField[]
  created_at: number;
}

export interface PoolItemRow {
  id: string;
  pool_id: string;
  data: string; // JSON string
  created_at: number;
}

export interface StrategyRow {
  id: string;
  guild_id: string;
  name: string;
  pool_id: string;
  filter: string; // JSON string of FilterCondition[]
  distribution: string;
  consumable: number; // 0 or 1
  created_at: number;
}

export interface SessionRow {
  id: string;
  guild_id: string;
  strategy_id: string;
  status: string;
  created_at: number;
}

export interface SessionItemRow {
  id: string;
  session_id: string;
  pool_item_id: string;
  data: string; // JSON string
  consumed: number; // 0 or 1
  consumed_at: number | null;
}

export interface HistoryRow {
  id: string;
  session_id: string;
  user_id: string;
  session_item_id: string;
  round: number;
  created_at: number;
}
