import { describe, it, expect } from 'vitest';
import { randomUnique } from '../../../src/modules/draw/distribution/strategies/randomUnique.js';
import { getDistributionStrategy } from '../../../src/modules/draw/distribution/index.js';

describe('randomUnique strategy', () => {
  const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('returns the correct number of items', () => {
    const result = randomUnique.distribute(candidates, 3);
    expect(result).toHaveLength(3);
  });

  it('returns no duplicates', () => {
    const result = randomUnique.distribute(candidates, 5);
    const unique = new Set(result);
    expect(unique.size).toBe(5);
  });

  it('only returns items from candidates', () => {
    const result = randomUnique.distribute(candidates, 5);
    for (const item of result) {
      expect(candidates).toContain(item);
    }
  });

  it('returns all items when count equals candidates length', () => {
    const result = randomUnique.distribute(candidates, candidates.length);
    expect(result).toHaveLength(candidates.length);
    expect(new Set(result)).toEqual(new Set(candidates));
  });

  it('throws error if candidates are insufficient', () => {
    expect(() => randomUnique.distribute([1, 2], 5)).toThrow(
      /Not enough candidates/,
    );
  });

  it('does not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    randomUnique.distribute(original, 3);
    expect(original).toEqual(copy);
  });
});

describe('getDistributionStrategy', () => {
  it('returns randomUnique for "random-unique"', () => {
    const strategy = getDistributionStrategy('random-unique');
    expect(strategy.name).toBe('random-unique');
    expect(typeof strategy.distribute).toBe('function');
  });

  it('throws error for unknown strategy', () => {
    expect(() => getDistributionStrategy('unknown')).toThrow(
      /Unknown distribution strategy/,
    );
  });
});
