/**
 * Tracks whether the collapsed header dropdown (PageScaffold "bar" mode) is open.
 * Components like BottomNav can subscribe to hide themselves when true.
 */
export let headerDropdown = $state({
  open: false,
});
