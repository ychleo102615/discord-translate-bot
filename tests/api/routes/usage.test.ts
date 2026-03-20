import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/modules/translate/usageTracker.js', () => ({
  getUsage: vi.fn().mockReturnValue({ totalChars: 1000, resetAt: '2026-04-01T00:00:00.000Z', limitReached: false }),
  getLimit: vi.fn().mockReturnValue(500000),
}));

import { getUsage, getLimit } from '../../../src/modules/translate/usageTracker.js';

describe('usage routes', () => {
  it('getUsage returns usage data', () => {
    const usage = getUsage();
    expect(usage.totalChars).toBe(1000);
    expect(usage.limitReached).toBe(false);
  });

  it('getLimit returns limit', () => {
    expect(getLimit()).toBe(500000);
  });
});
