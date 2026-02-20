// Barrel re-export from the canonical runes-based popup system.
// All popup state and controls live in popUp.svelte.ts.
// History sync + dirty tracking utilities were removed (see git history)
// — they operated on a separate Svelte store that nothing rendered.
export {
  popupState,
  popupControls,
  openFlowPopup,
  type PopupContentDefinition,
} from './popUp.svelte';
