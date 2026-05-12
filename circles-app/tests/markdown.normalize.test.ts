import { describe, it, expect } from 'vitest';
import { normalizeMarkdownInput } from '$lib/shared/utils/isValid';

describe('normalizeMarkdownInput', () => {
  it('does not strip backslashes', () => {
    const src = String.raw`\*not emphasis\*`;
    expect(normalizeMarkdownInput(src)).toBe(src);
  });

  it('converts escaped newline sequences', () => {
    expect(normalizeMarkdownInput('a\\nb')).toBe('a\nb');
  });
});
