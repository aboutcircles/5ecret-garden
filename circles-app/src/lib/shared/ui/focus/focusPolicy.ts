export function shouldAutoFocusTextInput(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;
  const desktopWidth = window.matchMedia('(min-width: 768px)').matches;
  return hasFinePointer && canHover && desktopWidth;
}

export function focusElement(el: HTMLElement | null | undefined): void {
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch (e) {
    console.debug('[focus] focus({preventScroll:true}) failed; falling back to plain focus()', e);
    el.focus();
  }
}
