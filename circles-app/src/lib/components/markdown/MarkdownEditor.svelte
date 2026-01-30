<script lang="ts">
  import { onMount } from 'svelte';
  import Markdown from '$lib/components/markdown/Markdown.svelte';
  import { normalizeMarkdownInput } from '$lib/utils/isValid';

  type Mode = 'write' | 'preview' | 'split';

  interface Props {
    value?: string;
    placeholder?: string;
    rows?: number;
    readonly?: boolean;
    editorClass?: string;
    previewClass?: string;
    containerClass?: string;
  }

  let {
    value = $bindable(''),
    placeholder = '',
    rows = 4,
    readonly = false,
    editorClass = 'textarea textarea-bordered w-full',
    previewClass = 'prose prose-sm max-w-none',
    containerClass = '',
  }: Props = $props();

  let mode: Mode = $state('write');

  onMount(() => {
    const isLargeScreen = window.matchMedia('(min-width: 768px)').matches;
    if (isLargeScreen) {
      mode = 'split';
    }
  });

  let ta: HTMLTextAreaElement | null = $state(null);

  const showEditor = $derived(mode === 'write' || mode === 'split');
  const showPreview = $derived(mode === 'preview' || mode === 'split');
  const isSplit = $derived(mode === 'split');

  function setMode(next: Mode): void {
    mode = next;
  }

  function normalizeNow(): void {
    const next = normalizeMarkdownInput(value);
    const changed = next !== value;
    if (changed) {
      value = next;
    }
  }

  function withTextarea(fn: (el: HTMLTextAreaElement) => void): void {
    const hasEl = ta !== null;
    if (!hasEl) {
      return;
    }
    fn(ta);
  }

  function wrapSelection(before: string, after: string): void {
    const isReadonly = readonly;
    if (isReadonly) {
      return;
    }

    withTextarea((el) => {
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;

      const head = value.slice(0, start);
      const mid = value.slice(start, end);
      const tail = value.slice(end);

      value = `${head}${before}${mid}${after}${tail}`;

      queueMicrotask(() => {
        el.focus();
        el.selectionStart = start + before.length;
        el.selectionEnd = end + before.length;
      });
    });
  }

  function insertLinkTemplate(): void {
    const isReadonly = readonly;
    if (isReadonly) {
      return;
    }

    wrapSelection('[', '](https://example.com)');
  }
</script>

<div class={containerClass}>
  <div class="flex items-center gap-2 mb-2">
    <div class="join">
      <button
        type="button"
        class="btn btn-xs join-item {mode === 'write' ? 'btn-neutral' : ''}"
        onclick={() => setMode('write')}
        aria-pressed={mode === 'write'}
      >
        Write
      </button>
      <button
        type="button"
        class="btn btn-xs join-item {mode === 'preview' ? 'btn-neutral' : ''}"
        onclick={() => setMode('preview')}
        aria-pressed={mode === 'preview'}
      >
        Preview
      </button>
      <button
        type="button"
        class="btn btn-xs join-item {mode === 'split' ? 'btn-neutral' : ''}"
        onclick={() => setMode('split')}
        aria-pressed={mode === 'split'}
      >
        Split
      </button>
    </div>

    <div class="join ml-2">
      <button type="button" class="btn btn-xs join-item" onclick={() => wrapSelection('**', '**')} disabled={readonly}>
        B
      </button>
      <button type="button" class="btn btn-xs join-item" onclick={() => wrapSelection('*', '*')} disabled={readonly}>
        I
      </button>
      <button type="button" class="btn btn-xs join-item" onclick={insertLinkTemplate} disabled={readonly}>
        Link
      </button>
    </div>
  </div>

  <div class={isSplit ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : ''}>
    {#if showEditor}
      <textarea
        bind:this={ta}
        class={editorClass}
        bind:value
        {placeholder}
        {rows}
        readonly={readonly}
        onblur={normalizeNow}
      ></textarea>
    {/if}

    {#if showPreview}
      <div class="bg-base-100 border border-base-300 rounded-lg p-3">
        <Markdown content={value} class={previewClass} />
      </div>
    {/if}
  </div>
</div>
