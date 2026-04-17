import {writable} from 'svelte/store';

/**
 * Tracks whether the collapsed header dropdown (PageScaffold "bar" mode) is open.
 * Components like BottomNav can subscribe to hide themselves when true.
 */
export const headerDropdownOpen = writable<boolean> (false);
