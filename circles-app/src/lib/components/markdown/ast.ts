// src/lib/markdown/ast.ts
// Minimal Markdown → AST for a safe subset. No HTML passthrough.

export type Root = { type: 'root'; children: Block[] };

export type Block =
    | { type: 'paragraph'; children: Inline[] }
    | { type: 'blockquote'; children: Block[] }
    | { type: 'list'; ordered: boolean; items: Inline[][] }
    | { type: 'code'; lang?: string; value: string };

export type Inline =
    | { type: 'text'; value: string }
    | { type: 'inlineCode'; value: string }
    | { type: 'strong'; children: Inline[] }
    | { type: 'emphasis'; children: Inline[] }
    | { type: 'link'; url: string; isExternal: boolean; children: Inline[] };

const allowedProtocols = new Set(['http:', 'https:', 'mailto:']);

export function sanitizeUrl(raw: string): string | null {
    const isString = typeof raw === 'string';
    const input = isString ? raw : String(raw);
    const trimmedOuter = input.trim();

    const hasAngleBrackets = trimmedOuter.startsWith('<') && trimmedOuter.endsWith('>');
    const candidate = hasAngleBrackets ? trimmedOuter.slice(1, -1).trim() : trimmedOuter;

    const hasControlChars = /[\u0000-\u001F\u007F]/.test(candidate);
    if (hasControlChars) {
        return null;
    }

    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate);
    if (looksLikeEmail) {
        return `mailto:${candidate}`;
    }

    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate);
    if (!hasScheme) {
        return null;
    }

    try {
        const u = new URL(candidate);
        const isAllowed = allowedProtocols.has(u.protocol);
        if (!isAllowed) {
            return null;
        }
        return u.href;
    } catch (err) {
        // Invalid URL → not a link; returning null is intentional.
        return null;
    }
}

export function parseMarkdown(src: string): Root {
    const hasInput = typeof src === 'string' && src.length > 0;
    const children: Block[] = hasInput ? parseBlocks(src) : [];
    return { type: 'root', children };
}

// ------------------------ Block parsing ------------------------

function parseBlocks(src: string): Block[] {
    const normalized = src.replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n');

    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        const isBlankLine = line.trim().length === 0;
        if (isBlankLine) {
            i += 1;
            continue;
        }

        // Fenced code block
        const fenceOpen = line.match(/^\s*```([a-zA-Z0-9+_-]+)?\s*$/);
        const isFenceOpen = fenceOpen !== null;
        if (isFenceOpen) {
            const lang = fenceOpen![1] || undefined;
            i += 1;
            const codeLines: string[] = [];

            while (i < lines.length) {
                const maybeClose = lines[i];
                const isFenceClose = /^\s*```\s*$/.test(maybeClose);
                if (isFenceClose) {
                    i += 1;
                    break;
                }
                codeLines.push(maybeClose);
                i += 1;
            }

            blocks.push({ type: 'code', lang, value: codeLines.join('\n') });
            continue;
        }

        // Blockquote (collect consecutive > lines; recurse)
        const quoteOpen = line.match(/^\s*>\s?(.*)$/);
        const isQuote = quoteOpen !== null;
        if (isQuote) {
            const qLines: string[] = [];
            while (i < lines.length) {
                const m = lines[i].match(/^\s*>\s?(.*)$/);
                const stillQuote = m !== null;
                if (!stillQuote) {
                    break;
                }
                qLines.push(m![1]);
                i += 1;
            }
            const inner = qLines.join('\n');
            const children = parseBlocks(inner);
            blocks.push({ type: 'blockquote', children });
            continue;
        }

        // Unordered list
        const ulOpen = line.match(/^\s{0,3}([*+-])\s+(.+)$/);
        const isUL = ulOpen !== null;
        if (isUL) {
            const items: Inline[][] = [];
            while (i < lines.length) {
                const m = lines[i].match(/^\s{0,3}([*+-])\s+(.+)$/);
                const stillItem = m !== null;
                if (!stillItem) {
                    break;
                }
                const text = m![2];
                items.push(parseInlines(text));
                i += 1;
            }
            blocks.push({ type: 'list', ordered: false, items });
            continue;
        }

        // Ordered list
        const olOpen = line.match(/^\s{0,3}(\d+)[.)]\s+(.+)$/);
        const isOL = olOpen !== null;
        if (isOL) {
            const items: Inline[][] = [];
            while (i < lines.length) {
                const m = lines[i].match(/^\s{0,3}(\d+)[.)]\s+(.+)$/);
                const stillItem = m !== null;
                if (!stillItem) {
                    break;
                }
                const text = m![2];
                items.push(parseInlines(text));
                i += 1;
            }
            blocks.push({ type: 'list', ordered: true, items });
            continue;
        }

        // Paragraph: consume until blank or next block marker
        const pLines: string[] = [line];
        i += 1;
        while (i < lines.length) {
            const next = lines[i];
            const isNextBlank = next.trim().length === 0;

            const startsFence = /^\s*```/.test(next);
            const startsQuote = /^\s*>\s?/.test(next);
            const startsUL = /^\s{0,3}([*+-])\s+/.test(next);
            const startsOL = /^\s{0,3}\d+[.)]\s+/.test(next);

            const startsBlock = startsFence || startsQuote || startsUL || startsOL;

            if (isNextBlank || startsBlock) {
                break;
            }
            pLines.push(next);
            i += 1;
        }

        const paraText = pLines.join('\n');
        blocks.push({ type: 'paragraph', children: parseInlines(paraText) });
    }

    return blocks;
}

// ------------------------ Inline parsing ------------------------

function parseInlines(input: string): Inline[] {
    if (input.length === 0) {
        return [];
    }
    // 1) split on single backtick code spans (no nesting)
    const out: Inline[] = [];
    let i = 0;

    while (i < input.length) {
        const open = input.indexOf('`', i);
        const hasBacktick = open !== -1;

        if (!hasBacktick) {
            out.push(...parseNonCode(input.slice(i)));
            break;
        }

        const before = input.slice(i, open);
        const hasBefore = before.length > 0;
        if (hasBefore) {
            out.push(...parseNonCode(before));
        }

        const close = input.indexOf('`', open + 1);
        const hasClosing = close !== -1;

        if (!hasClosing) {
            // Treat unmatched backtick as literal text.
            out.push(...parseNonCode(input.slice(open)));
            break;
        }

        const codeContent = input.slice(open + 1, close);
        out.push({ type: 'inlineCode', value: codeContent });

        i = close + 1;
    }

    return out;
}

function parseNonCode(segment: string): Inline[] {
    // Markdown links [label](href) first, then emphasis, then autolink.
    const nodes: Inline[] = [];
    const linkMd = /\[([^\]]+)\]\(([^)]+)\)/g;
    let cursor = 0;
    let m: RegExpExecArray | null;

    while ((m = linkMd.exec(segment)) !== null) {
        const before = segment.slice(cursor, m.index);
        const hasBefore = before.length > 0;
        if (hasBefore) {
            nodes.push(...parseEmphasis(before));
        }

        const label = m[1];
        const hrefRaw = m[2];
        const href = sanitizeUrl(hrefRaw);
        const isValid = href !== null;

        if (isValid) {
            const isExternal = href!.startsWith('http');
            // Label is treated as plain inline text (no nested emphasis in label).
            nodes.push({ type: 'link', url: href!, isExternal, children: [{ type: 'text', value: label }] });
        } else {
            nodes.push(...parseEmphasis(m[0]));
        }

        cursor = m.index + m[0].length;
    }

    const tail = segment.slice(cursor);
    const hasTail = tail.length > 0;
    if (hasTail) {
        nodes.push(...parseEmphasis(tail));
    }

    return nodes;
}

function parseEmphasis(text: string): Inline[] {
    // Very small emphasis tokenizer: **strong** / __strong__ / *em* / _em_
    // Does not nest emphasis; does not cross newlines.
    const nodes: Inline[] = [];
    const emRe = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
    let idx = 0;
    let m: RegExpExecArray | null;

    while ((m = emRe.exec(text)) !== null) {
        const before = text.slice(idx, m.index);
        const hasBefore = before.length > 0;
        if (hasBefore) {
            nodes.push(...autolink(before));
        }

        const token = m[0];
        const isStrongStar = token.startsWith('**');
        const isStrongUnderscore = token.startsWith('__');
        const isStrong = isStrongStar || isStrongUnderscore;

        const content = isStrong
            ? token.slice(2, token.length - 2)
            : token.slice(1, token.length - 1);

        const inner = autolink(content);

        if (isStrong) {
            nodes.push({ type: 'strong', children: inner });
        } else {
            nodes.push({ type: 'emphasis', children: inner });
        }

        idx = m.index + token.length;
    }

    const rest = text.slice(idx);
    const hasRest = rest.length > 0;
    if (hasRest) {
        nodes.push(...autolink(rest));
    }

    return nodes;
}

function autolink(text: string): Inline[] {
    const out: Inline[] = [];
    const urlRe = /\b((https?:\/\/)[^\s<>()]+[^\s<>().,!?;:'")\]])/g;
    const emailRe = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

    let idx = 0;
    let m: RegExpExecArray | null;

    while ((m = urlRe.exec(text)) !== null) {
        const before = text.slice(idx, m.index);
        const hasBefore = before.length > 0;
        if (hasBefore) {
            out.push({ type: 'text', value: before });
        }

        const href = sanitizeUrl(m[1]);
        const isValid = href !== null;
        if (isValid) {
            out.push({ type: 'link', url: href!, isExternal: true, children: [{ type: 'text', value: m[1] }] });
        } else {
            out.push({ type: 'text', value: m[1] });
        }

        idx = m.index + m[1].length;
    }

    const rest = text.slice(idx);
    const hasRest = rest.length > 0;
    if (hasRest) {
        let eIdx = 0;
        let em: RegExpExecArray | null;

        while ((em = emailRe.exec(rest)) !== null) {
            const before = rest.slice(eIdx, em.index);
            const hasBefore = before.length > 0;
            if (hasBefore) {
                out.push({ type: 'text', value: before });
            }

            const href = sanitizeUrl(em[1]);
            const isValid = href !== null;
            if (isValid) {
                out.push({ type: 'link', url: href!, isExternal: false, children: [{ type: 'text', value: em[1] }] });
            } else {
                out.push({ type: 'text', value: em[1] });
            }

            eIdx = em.index + em[1].length;
        }

        const tail = rest.slice(eIdx);
        const hasTail = tail.length > 0;
        if (hasTail) {
            out.push({ type: 'text', value: tail });
        }
    }

    return out;
}
