export interface OutsidePointerCloseOptions {
  isEnabled: () => boolean;
  isInside: (target: Node) => boolean;
  onOutside: () => void;
}

/**
 * Shared helper for overlay/popup close-on-outside-pointer behavior.
 * Returns a disposer that removes the listener.
 */
export function registerOutsidePointerClose(options: OutsidePointerCloseOptions): () => void {
  function onWindowPointerDown(event: PointerEvent): void {
    if (!options.isEnabled()) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (options.isInside(target)) return;
    options.onOutside();
  }

  window.addEventListener('pointerdown', onWindowPointerDown);
  return () => {
    window.removeEventListener('pointerdown', onWindowPointerDown);
  };
}
