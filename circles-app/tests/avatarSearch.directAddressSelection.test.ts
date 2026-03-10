import { describe, expect, it } from 'vitest';
import {
  buildDirectAddressSelectionRows,
  makeBaseAvatarSearchItem,
  shouldAutoSelectSingleRowOnEnter,
} from '$lib/shared/ui/avatar-search/avatarSearch.merge';

describe('buildDirectAddressSelectionRows', () => {
  it('returns null for non-address queries', () => {
    expect(buildDirectAddressSelectionRows('alice', [])).toBeNull();
  });

  it('returns exactly one row for a valid address query', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const rows = buildDirectAddressSelectionRows(address, []);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].address).toBe(address);
  });

  it('reuses existing merged row for the queried address', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const existing = {
      ...makeBaseAvatarSearchItem(address),
      name: 'Known Avatar',
      hasProfile: true,
    };

    const rows = buildDirectAddressSelectionRows(address, [existing]);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].name).toBe('Known Avatar');
    expect(rows?.[0].hasProfile).toBe(true);
  });
});

describe('shouldAutoSelectSingleRowOnEnter', () => {
  it('returns true only for Enter with exactly one visible row', () => {
    expect(shouldAutoSelectSingleRowOnEnter('Enter', 1)).toBe(true);
    expect(shouldAutoSelectSingleRowOnEnter('Enter', 0)).toBe(false);
    expect(shouldAutoSelectSingleRowOnEnter('Enter', 2)).toBe(false);
    expect(shouldAutoSelectSingleRowOnEnter('ArrowDown', 1)).toBe(false);
  });

  it('returns false while composing input', () => {
    expect(shouldAutoSelectSingleRowOnEnter('Enter', 1, true)).toBe(false);
  });

  it('returns false when the search input is not focused', () => {
    expect(shouldAutoSelectSingleRowOnEnter('Enter', 1, false, false)).toBe(false);
  });
});
