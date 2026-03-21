import type { FilterCondition } from './types.js';

export function applyFilters(
  items: Array<{ data: Record<string, unknown> }>,
  filters: FilterCondition[],
): Array<{ data: Record<string, unknown> }> {
  if (filters.length === 0) return items;

  return items.filter((item) =>
    filters.every((condition) => matchCondition(item.data, condition)),
  );
}

function matchCondition(
  data: Record<string, unknown>,
  condition: FilterCondition,
): boolean {
  const { field, operator, value } = condition;

  if (!(field in data)) return false;

  const fieldValue = data[field];

  switch (operator) {
    case 'eq':
      return fieldValue === value;

    case 'neq':
      return fieldValue !== value;

    case 'in':
      return Array.isArray(value) && value.includes(fieldValue as string);

    case 'gt':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;

    case 'gte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;

    case 'lt':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;

    case 'lte':
      return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;

    default:
      return false;
  }
}
