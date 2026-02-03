import { describe, expect, it } from 'vitest';
import { parseMarkdown, sanitizeUrl, type Inline } from '$lib/components/markdown/ast';

describe('markdown AST parsing', () => {
  it('preserves a single blank line between blocks', () => {
    const ast = parseMarkdown('one\n\nTwo');
    expect(ast.children.map((b) => b.type)).toEqual(['paragraph', 'blankLine', 'paragraph']);
  });

  it('collapses multiple blank lines into a single blank line node', () => {
    const ast = parseMarkdown('one\n\n\n\nTwo');
    expect(ast.children.map((b) => b.type)).toEqual(['paragraph', 'blankLine', 'paragraph']);
  });

  it('parses **bold** as a strong node', () => {
    const ast = parseMarkdown('Made from **65% recycled materials**.');
    expect(ast.children).toHaveLength(1);
    const p = ast.children[0];
    expect(p.type).toBe('paragraph');

    const strong = (p.type === 'paragraph'
      ? p.children.find((c: Inline) => c.type === 'strong')
      : undefined) as Inline | undefined;

    expect(strong && strong.type).toBe('strong');
  });

  it('normalizes bare domains to https URLs', () => {
    expect(sanitizeUrl('example.com')).toBe('https://example.com/');
    expect(sanitizeUrl('example.com/path?q=1')).toBe('https://example.com/path?q=1');
  });

  it('parses [label](example.com) as a link node (via https normalization)', () => {
    const ast = parseMarkdown('test [swag](example.com) ok');
    const p = ast.children[0];
    expect(p.type).toBe('paragraph');

    const link = (p.type === 'paragraph'
      ? p.children.find((c: Inline) => c.type === 'link')
      : undefined) as Inline | undefined;

    expect(link && link.type).toBe('link');
    if (link && link.type === 'link') {
      expect(link.url).toBe('https://example.com/');
    }
  });
});
