<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Writable } from 'svelte/store';
  import ListToolbar from './ListToolbar.svelte';
  import ListStates from './ListStates.svelte';

  interface Props {
    query: Writable<string>;
    searchPlaceholder?: string;
    toolbarClass?: string;
    toolbarActions?: Snippet;
    toolbarBelow?: Snippet;
    onInputKeydown?: (event: KeyboardEvent) => void;
    onInputFocus?: (event: FocusEvent) => void;
    inputDataAttribute?: string;
    inputEl?: HTMLInputElement | null;

    loading?: boolean;
    error?: string | null;
    isEmpty?: boolean;
    isNoMatches?: boolean;
    loadingLabel?: string;
    emptyLabel?: string;
    noMatchesLabel?: string;

    wrapInListContainer?: boolean;
    listRole?: string;
    listClass?: string;

    children?: Snippet;
  }

  let {
    query,
    searchPlaceholder = 'Search by address or name',
    toolbarClass = '',
    toolbarActions,
    toolbarBelow,
    onInputKeydown,
    onInputFocus,
    inputDataAttribute,
    inputEl = $bindable(null),
    loading = false,
    error = null,
    isEmpty = false,
    isNoMatches = false,
    loadingLabel = 'Loading…',
    emptyLabel = 'No items',
    noMatchesLabel = 'No matches',
    wrapInListContainer = true,
    listRole = 'list',
    listClass = 'w-full flex flex-col gap-y-1.5',
    children,
  }: Props = $props();
</script>

<ListToolbar
  query={query}
  placeholder={searchPlaceholder}
  class={toolbarClass}
  actions={toolbarActions}
  bind:inputEl={inputEl}
  {onInputKeydown}
  {onInputFocus}
  {inputDataAttribute}
/>

{#if toolbarBelow}
  <div class="mb-3">
    {@render toolbarBelow?.()}
  </div>
{/if}

<ListStates
  {loading}
  {error}
  {isEmpty}
  {isNoMatches}
  {loadingLabel}
  {emptyLabel}
  {noMatchesLabel}
>
  {#if wrapInListContainer}
    <div role={listRole} class={listClass}>
      {@render children?.()}
    </div>
  {:else}
    {@render children?.()}
  {/if}
</ListStates>
