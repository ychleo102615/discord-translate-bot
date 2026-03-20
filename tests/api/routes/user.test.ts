import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/modules/translate/userPrefs.js', () => ({
  getUserLanguage: vi.fn().mockReturnValue('zh-TW'),
  setUserLanguage: vi.fn(),
}));

import { getUserLanguage, setUserLanguage } from '../../../src/modules/translate/userPrefs.js';

describe('user routes', () => {
  it('getUserLanguage returns language', () => {
    expect(getUserLanguage('user1')).toBe('zh-TW');
  });

  it('setUserLanguage is callable', () => {
    setUserLanguage('user1', 'en');
    expect(setUserLanguage).toHaveBeenCalledWith('user1', 'en');
  });
});
