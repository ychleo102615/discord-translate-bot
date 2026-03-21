import { describe, it, expect } from 'vitest';
import { applyFilters } from '../../../src/modules/draw/filter.js';
import type { FilterCondition } from '../../../src/modules/draw/types.js';

const items = [
  { data: { name: 'AK-47', category: '步槍', rarity: 3 } },
  { data: { name: 'M4A1', category: '步槍', rarity: 4 } },
  { data: { name: 'Glock', category: '手槍', rarity: 2 } },
  { data: { name: 'AWP', category: '狙擊槍', rarity: 5 } },
];

describe('applyFilters', () => {
  it('returns all items when filters are empty', () => {
    expect(applyFilters(items, [])).toEqual(items);
  });

  describe('eq operator', () => {
    it('matches exact string value', () => {
      const filters: FilterCondition[] = [{ field: 'category', operator: 'eq', value: '手槍' }];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(1);
      expect(result[0].data.name).toBe('Glock');
    });

    it('matches exact number value', () => {
      const filters: FilterCondition[] = [{ field: 'rarity', operator: 'eq', value: 5 }];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(1);
      expect(result[0].data.name).toBe('AWP');
    });
  });

  describe('neq operator', () => {
    it('excludes matching items', () => {
      const filters: FilterCondition[] = [{ field: 'category', operator: 'neq', value: '步槍' }];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.data.name)).toEqual(['Glock', 'AWP']);
    });
  });

  describe('in operator', () => {
    it('matches values in array', () => {
      const filters: FilterCondition[] = [
        { field: 'category', operator: 'in', value: ['手槍', '狙擊槍'] },
      ];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.data.name)).toEqual(['Glock', 'AWP']);
    });
  });

  describe('numeric comparison operators', () => {
    it('gt: greater than', () => {
      const filters: FilterCondition[] = [{ field: 'rarity', operator: 'gt', value: 3 }];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.data.name)).toEqual(['M4A1', 'AWP']);
    });

    it('gte: greater than or equal', () => {
      const filters: FilterCondition[] = [{ field: 'rarity', operator: 'gte', value: 3 }];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(3);
    });

    it('lt: less than', () => {
      const filters: FilterCondition[] = [{ field: 'rarity', operator: 'lt', value: 3 }];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(1);
      expect(result[0].data.name).toBe('Glock');
    });

    it('lte: less than or equal', () => {
      const filters: FilterCondition[] = [{ field: 'rarity', operator: 'lte', value: 3 }];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(2);
    });
  });

  describe('AND combination', () => {
    it('applies multiple filters with AND logic', () => {
      const filters: FilterCondition[] = [
        { field: 'category', operator: 'eq', value: '步槍' },
        { field: 'rarity', operator: 'gte', value: 4 },
      ];
      const result = applyFilters(items, filters);
      expect(result).toHaveLength(1);
      expect(result[0].data.name).toBe('M4A1');
    });
  });

  describe('missing fields', () => {
    it('excludes items that lack the filtered field', () => {
      const mixedItems = [
        { data: { name: 'A', score: 10 } },
        { data: { name: 'B' } }, // no score field
        { data: { name: 'C', score: 20 } },
      ];
      const filters: FilterCondition[] = [{ field: 'score', operator: 'gte', value: 5 }];
      const result = applyFilters(mixedItems, filters);
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.data.name)).toEqual(['A', 'C']);
    });
  });
});
