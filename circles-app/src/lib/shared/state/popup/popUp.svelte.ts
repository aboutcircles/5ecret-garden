// Single source of truth for popup state lives in `./index.ts` (a Svelte
// writable store), which is what `PopupHost.svelte` (the only mounted popup
// host) reads via `$popupState`. Some legacy callsites still import directly
// from this path, so we re-export to keep both import paths writing to the
// same state.
export {
  popupControls,
  popupState,
  openFlowPopup,
  type PopupContentDefinition,
} from './index';
