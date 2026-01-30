import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '$lib/components/markdown/ast';
import { jumpHref } from '$lib/components/markdown/jump';

describe('safe markdown link handling', () => {
  it('sanitizeUrl rejects dangerous protocols', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe(null);
    expect(sanitizeUrl('data:text/html,<h1>x</h1>')).toBe(null);
  });

  it('sanitizeUrl allows https/http/mailto and normalizes emails to mailto:', () => {
    expect(sanitizeUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    expect(sanitizeUrl('user@example.com')).toBe('mailto:user@example.com');
  });

  it('jumpHref encodes the destination into /jump?to=', () => {
    const href = 'https://example.com/a?b=c&d=e#frag';
    expect(jumpHref(href)).toBe(`/jump?to=${encodeURIComponent(href)}`);
  });
});
