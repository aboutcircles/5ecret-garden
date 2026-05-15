<script lang="ts">
  import { getContext } from 'svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { formatTrustRelation } from '$lib/shared/utils/helpers';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import {
    profileBookmarksService,
    profileBookmarksStore,
    type ProfileBookmark,
  } from '$lib/areas/settings/state/profileBookmarks';
  import type { AvatarSearchItem } from './avatarSearch.types';

  const ACTIVATE_CTX_KEY = 'avatar-search-row-activate';
  type ActivateRow = (item: AvatarSearchItem) => void;

  interface Props {
    item: AvatarSearchItem;
  }

  let { item }: Props = $props();

  const activate = getContext<ActivateRow | undefined>(ACTIVATE_CTX_KEY);

  function runActivate(): void {
    activate?.(item);
  }

  function focusSearchInput(anchor?: HTMLElement | null): void {
    const scope = anchor?.closest<HTMLElement>('[data-avatar-search-list-scope]')
      ?? document.querySelector<HTMLElement>('[data-avatar-search-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-avatar-search-input]')
      ?? document.querySelector<HTMLInputElement>('[data-avatar-search-input]');
    input?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: (anchor) => {
      const scope = anchor?.closest<HTMLElement>('[data-avatar-search-list-scope]')
        ?? document.querySelector<HTMLElement>('[data-avatar-search-list-scope]');
      return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-avatar-search-row]'));
    },
    focusInput: focusSearchInput,
    onActivateRow: runActivate,
  });

  function onRowKeydown(event: KeyboardEvent): void {
    listNavigator.onRowKeydown(event);
  }

  function onRowClick(event: MouseEvent): void {
    listNavigator.onRowClick(event);
    runActivate();
  }

  const bookmarkEntry = $derived.by((): ProfileBookmark | undefined => {
    const list = $profileBookmarksStore ?? [];
    const target = String(item.address).toLowerCase();
    return list.find((b) => b.address === target);
  });
  const isFavorite = $derived(!!bookmarkEntry);
  const note = $derived(bookmarkEntry?.note ?? '');

  let editingNote = $state(false);
  let noteDraft = $state('');
  let noteInputEl: HTMLInputElement | null = $state(null);
  let cancellingEdit = $state(false);

  function toggleFavorite(event: MouseEvent | KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (isFavorite) {
      profileBookmarksService.removeProfile(item.address);
      if (editingNote) editingNote = false;
    } else {
      profileBookmarksService.upsertProfile(item.address);
    }
  }

  function startEditNote(event: MouseEvent | KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    noteDraft = note;
    editingNote = true;
    queueMicrotask(() => noteInputEl?.focus());
  }

  function commitNote(): void {
    if (cancellingEdit) {
      cancellingEdit = false;
      editingNote = false;
      noteDraft = '';
      return;
    }
    if (!isFavorite) {
      editingNote = false;
      noteDraft = '';
      return;
    }
    const next = noteDraft.trim();
    profileBookmarksService.upsertProfile(item.address, { note: next.length ? next : undefined });
    editingNote = false;
  }

  function cancelEditNote(): void {
    cancellingEdit = true;
    editingNote = false;
    noteDraft = '';
  }

  function onNoteKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      commitNote();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditNote();
    }
  }

  const bottomInfo = $derived(
    note.length > 0
      ? note
      : item.trustRelation
        ? formatTrustRelation(item.trustRelation)
        : ''
  );
</script>

<div>
  <div
    data-avatar-search-row
    tabindex={0}
    role="button"
    aria-label={`Open profile for ${item.address}`}
    class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    onkeydown={onRowKeydown}
    onclick={onRowClick}
  >
    <RowFrame clickable={true} dense={true} noLeading={true}>
      <div class="min-w-0">
        <Avatar
          address={item.address}
          view="horizontal"
          bottomInfo={bottomInfo}
          showTypeInfo={true}
          clickable={true}
        />
      </div>
      {#snippet trailing()}
        <div class="flex items-center gap-1" onclick={(e) => e.stopPropagation()} role="presentation">
          {#if isFavorite}
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-base-content"
              aria-label={editingNote ? 'Cancel editing nickname' : 'Edit nickname'}
              title={editingNote ? 'Cancel editing nickname' : 'Edit nickname'}
              onclick={(e) => (editingNote ? cancelEditNote() : startEditNote(e))}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path d="M2.695 14.762l-1.262 3.155a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.886L17.5 5.501a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </button>
          {/if}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square {isFavorite ? 'text-warning' : 'text-base-content/40 hover:text-warning'}"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onclick={toggleFavorite}
          >
            {#if isFavorite}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.77l-5.2 2.74.99-5.8L1.58 7.62l5.82-.85L10 1.5z" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true">
                <path d="M10 2.5l2.39 4.85 5.35.78-3.87 3.77.91 5.33L10 14.7l-4.78 2.53.91-5.33L2.26 8.13l5.35-.78L10 2.5z" />
              </svg>
            {/if}
          </button>
        </div>
      {/snippet}
    </RowFrame>
  </div>

  {#if isFavorite && editingNote}
    <div class="px-2 pb-3 -mt-1" onclick={(e) => e.stopPropagation()} role="presentation">
      <input
        bind:this={noteInputEl}
        bind:value={noteDraft}
        type="text"
        placeholder="Nickname (e.g. Mom's wallet)"
        maxlength={64}
        class="input input-sm input-bordered w-full"
        onkeydown={onNoteKeydown}
        onblur={commitNote}
        aria-label="Nickname for this favorite"
      />
    </div>
  {/if}
</div>
