<script lang="ts">
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Bold as LBold, Italic as LItalic, Link2 as LLink2 } from 'lucide';

  type Props = {
    value?: string;
    placeholder?: string;
    rows?: number;
    readonly?: boolean;
    editorClass?: string;
    previewClass?: string;
    containerClass?: string;
  };

  let {
    value = $bindable(''),
    placeholder = '',
    rows = 4,
    readonly = false,
    editorClass = 'textarea textarea-bordered w-full',
    previewClass = 'prose prose-sm max-w-none',
    containerClass = '',
  }: Props = $props();

  let textarea = $state<HTMLTextAreaElement | null>(null);
  type ViewMode = 'editor' | 'preview';
  let viewMode = $state<ViewMode>('editor');

  const disabled = $derived(readonly);
  const showPreview = $derived(viewMode === 'preview');
  const canEdit = $derived(!disabled && viewMode === 'editor');
  const normalizedRows = $derived(Math.max(2, Number(rows) || 4));
  const minHeightStyle = $derived(`min-height: ${normalizedRows * 1.5}rem;`);

  type LinkRange = {
    start: number;
    end: number;
    labelStart: number;
    labelEnd: number;
    urlStart: number;
    urlEnd: number;
    label: string;
    url: string;
  };

  function onToolbarPointerDown(e: PointerEvent, action: () => void): void {
    e.preventDefault();
    e.stopPropagation();
    action();
  }

  function readSelection(): { text: string; start: number; end: number } | null {
    const hasTextarea = textarea !== null;
    if (!hasTextarea) {
      return null;
    }

    const text = textarea!.value;
    const start = textarea!.selectionStart ?? 0;
    const end = textarea!.selectionEnd ?? start;

    const clampedStart = Math.max(0, Math.min(start, text.length));
    const clampedEnd = Math.max(clampedStart, Math.min(end, text.length));

    return { text, start: clampedStart, end: clampedEnd };
  }

  function writeTextAndSelection(nextText: string, nextStart: number, nextEnd: number): void {
    const hasTextarea = textarea !== null;
    if (!hasTextarea) {
      value = nextText;
      return;
    }

    value = nextText;
    textarea!.value = nextText;

    const start = Math.max(0, Math.min(nextStart, nextText.length));
    const end = Math.max(start, Math.min(nextEnd, nextText.length));

    textarea!.focus();
    textarea!.setSelectionRange(start, end);
  }

  function toggleWrap(marker: string): void {
    if (!canEdit) {
      return;
    }

    const sel = readSelection();
    if (!sel) {
      return;
    }

    const { text, start, end } = sel;
    const hasSelection = start !== end;

    if (!hasSelection) {
      const insert = `${marker}${marker}`;
      const nextText = text.slice(0, start) + insert + text.slice(end);
      const caret = start + marker.length;
      writeTextAndSelection(nextText, caret, caret);
      return;
    }

    const selected = text.slice(start, end);

    const beforeStart = start - marker.length;
    const afterEnd = end + marker.length;

    const canUnwrap =
      beforeStart >= 0 &&
      afterEnd <= text.length &&
      text.slice(beforeStart, start) === marker &&
      text.slice(end, afterEnd) === marker;

    if (canUnwrap) {
      const nextText = text.slice(0, beforeStart) + selected + text.slice(afterEnd);
      const nextStart = beforeStart;
      const nextEnd = beforeStart + selected.length;
      writeTextAndSelection(nextText, nextStart, nextEnd);
      return;
    }

    const nextText = text.slice(0, start) + marker + selected + marker + text.slice(end);
    const nextStart = start + marker.length;
    const nextEnd = end + marker.length;
    writeTextAndSelection(nextText, nextStart, nextEnd);
  }

  function toggleBold(): void {
    toggleWrap('**');
  }

  function toggleItalic(): void {
    toggleWrap('*');
  }

  function findEnclosingLink(text: string, selStart: number, selEnd: number): LinkRange | null {
    const re = /\[([^\]]*)\]\(([^)]+)\)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const full = m[0];
      const start = m.index;
      const end = start + full.length;

      const isWithin = selStart >= start && selEnd <= end;
      if (!isWithin) {
        continue;
      }

      const label = m[1] ?? '';
      const url = m[2] ?? '';

      const labelStart = start + 1;
      const labelEnd = labelStart + label.length;

      const markerIdx = full.indexOf('](');
      const hasMarker = markerIdx >= 0;
      if (!hasMarker) {
        continue;
      }

      const urlStart = start + markerIdx + 2;
      const urlEnd = urlStart + url.length;

      return { start, end, labelStart, labelEnd, urlStart, urlEnd, label, url };
    }

    return null;
  }

  function normalizeHref(raw: string): string | null {
    const trimmed = raw.trim();
    const hasAny = trimmed.length > 0;

    if (!hasAny) {
      return null;
    }

    const lower = trimmed.toLowerCase();
    const isUnsafeScheme = lower.startsWith('javascript:') || lower.startsWith('data:');

    if (isUnsafeScheme) {
      return null;
    }

    const isAllowedAbsolute =
      lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:');
    if (isAllowedAbsolute) {
      return trimmed;
    }

    const isAllowedRelative = trimmed.startsWith('/') || trimmed.startsWith('#');
    if (isAllowedRelative) {
      return trimmed;
    }

    const looksLikeDomain = /^[\w.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(trimmed);
    if (looksLikeDomain) {
      return `https://${trimmed}`;
    }

    return null;
  }

  function setLink(): void {
    if (!canEdit) {
      return;
    }

    const sel = readSelection();
    if (!sel) {
      return;
    }

    const { text, start, end } = sel;

    const existing = findEnclosingLink(text, start, end);
    const initialHref = existing?.url || 'https://';

    const savedStart = start;
    const savedEnd = end;

    const input = window.prompt('Link URL', initialHref);
    const cancelled = input === null;

    if (cancelled) {
      writeTextAndSelection(text, savedStart, savedEnd);
      return;
    }

    const normalized = normalizeHref(input);
    const isValid = normalized !== null;

    if (!isValid) {
      window.alert('Invalid/unsafe URL.');
      writeTextAndSelection(text, savedStart, savedEnd);
      return;
    }

    const afterPromptSel = readSelection() ?? { text, start: savedStart, end: savedEnd };
    const freshText = afterPromptSel.text;

    const linkNow = findEnclosingLink(freshText, savedStart, savedEnd);
    const isUpdatingExisting = linkNow !== null;

    if (isUpdatingExisting) {
      const oldLen = linkNow!.urlEnd - linkNow!.urlStart;
      const nextText =
        freshText.slice(0, linkNow!.urlStart) + normalized + freshText.slice(linkNow!.urlEnd);
      const delta = normalized.length - oldLen;
      const caret = linkNow!.end + delta;
      writeTextAndSelection(nextText, caret, caret);
      return;
    }

    const hasSelection = savedStart !== savedEnd;

    if (hasSelection) {
      const label = freshText.slice(savedStart, savedEnd);
      const insert = `[${label}](${normalized})`;
      const nextText = freshText.slice(0, savedStart) + insert + freshText.slice(savedEnd);
      const nextLabelStart = savedStart + 1;
      const nextLabelEnd = nextLabelStart + label.length;
      writeTextAndSelection(nextText, nextLabelStart, nextLabelEnd);
      return;
    }

    const insert = `[](${normalized})`;
    const nextText = freshText.slice(0, savedStart) + insert + freshText.slice(savedEnd);
    const caret = savedStart + 1;
    writeTextAndSelection(nextText, caret, caret);
  }

  function setViewMode(mode: ViewMode): void {
    viewMode = mode;
  }

  function onEditorKeydown(e: KeyboardEvent): void {
    if (!canEdit) {
      return;
    }

    const hasModifier = e.ctrlKey || e.metaKey;
    if (!hasModifier || e.altKey) {
      return;
    }

    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      toggleBold();
      return;
    }
    if (key === 'i') {
      e.preventDefault();
      toggleItalic();
      return;
    }
    if (key === 'l') {
      e.preventDefault();
      setLink();
    }
  }
</script>

<div
  class={`mmw ${containerClass}`.trim()}
  data-disabled={disabled ? 'true' : 'false'}
  data-preview={showPreview ? 'true' : 'false'}
>
  {#if showPreview}
    <div class={`preview ${previewClass}`.trim()} style={minHeightStyle}>
      <Markdown content={value} />
    </div>
  {:else}
    <textarea
      bind:this={textarea}
      class={`editor ${editorClass}`.trim()}
      style={minHeightStyle}
      rows={normalizedRows}
      placeholder={placeholder}
      readonly={disabled}
      aria-disabled={disabled}
      spellcheck="false"
      bind:value={value}
      onkeydown={onEditorKeydown}
    ></textarea>
  {/if}

  <div class="toolbar">
    <div class="toolbar-group">
      <button
        type="button"
        class="tb"
        aria-label="Bold"
        tabindex="-1"
        disabled={!canEdit}
        onpointerdown={(e) => onToolbarPointerDown(e, toggleBold)}
      >
        <Lucide icon={LBold} size={16} ariaLabel="" />
      </button>
      <button
        type="button"
        class="tb"
        aria-label="Italic"
        tabindex="-1"
        disabled={!canEdit}
        onpointerdown={(e) => onToolbarPointerDown(e, toggleItalic)}
      >
        <Lucide icon={LItalic} size={16} ariaLabel="" />
      </button>
      <button
        type="button"
        class="tb"
        aria-label="Link"
        tabindex="-1"
        disabled={!canEdit}
        onpointerdown={(e) => onToolbarPointerDown(e, setLink)}
      >
        <Lucide icon={LLink2} size={16} ariaLabel="" />
      </button>
    </div>
    <div class="toolbar-tabs" aria-label="Markdown view tabs">
      <button
        type="button"
        class="tb tb-tab"
        tabindex="-1"
        aria-pressed={viewMode === 'editor'}
        onpointerdown={(e) => onToolbarPointerDown(e, () => setViewMode('editor'))}
      >
        Editor
      </button>
      <button
        type="button"
        class="tb tb-tab"
        tabindex="-1"
        aria-pressed={viewMode === 'preview'}
        onpointerdown={(e) => onToolbarPointerDown(e, () => setViewMode('preview'))}
      >
        Preview
      </button>
    </div>
  </div>
</div>

<style>
  .mmw {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .toolbar {
    order: -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .toolbar-group {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .toolbar-tabs {
    min-width: 180px;
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .tb-tab[aria-pressed='true'] {
    background: rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 0, 0, 0.2);
  }

  .tb {
    font: inherit;
    font-size: 12px;
    padding: 6px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    background: rgba(0, 0, 0, 0.02);
    border-radius: 8px;
    opacity: 0.92;
    cursor: pointer;
    transition: opacity 120ms ease, transform 120ms ease, background 120ms ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    min-height: 32px;
  }

  .tb:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.04);
  }

  .tb:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .tb:active {
    opacity: 1;
    transform: translateY(1px);
  }

  .editor {
    font: inherit;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: auto;
    resize: vertical;
  }

  .preview {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    background: rgba(0, 0, 0, 0.02);
  }

  .mmw[data-disabled='true'] .tb {
    opacity: 0.35;
    cursor: default;
  }

  .mmw[data-disabled='true'] .editor {
    opacity: 0.6;
  }
</style>
