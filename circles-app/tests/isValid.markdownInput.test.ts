import { describe, expect, it } from 'vitest';
import { normalizeMarkdownInput } from '$lib/shared/utils/isValid';

describe('normalizeMarkdownInput', () => {
  it('unescapes \\n/\\r/\\t but preserves backslashes and quotes', () => {
    const input = String.raw`Line 1\nLine 2 \*literal asterisks\* \ path "quoted" 'single'`;
    const out = normalizeMarkdownInput(input);

    // escape sequences become real characters
    expect(out).toContain('Line 1\nLine 2');

    // backslashes are preserved (no Markdown corruption)
    expect(out).toContain('\\*literal asterisks\\*');
    expect(out).toContain('\\ path');

    // quotes are not rewritten
    expect(out).toContain('"quoted"');
    expect(out).toContain("'single'");
  });
});
