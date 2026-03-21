import type { DistributionStrategy } from '../../types.js';

export const randomUnique: DistributionStrategy = {
  name: 'random-unique',

  distribute<T>(candidates: T[], count: number): T[] {
    if (candidates.length < count) {
      throw new Error(
        `Not enough candidates: need ${count}, but only ${candidates.length} available`,
      );
    }

    // Fisher-Yates shuffle on a copy, then take the first `count`
    const pool = [...candidates];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count);
  },
};
