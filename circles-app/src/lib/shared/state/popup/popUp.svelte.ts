import type { Component } from 'svelte';

export type PopupContentDefinition<T extends Record<string, any> = any> = {
  title?: string;
  /**
   * If true, the popup shell will not render the title text
   * (useful when the inner component already has its own header).
   */
  hideTitle?: boolean;
  component: Component<T>;
  props?: Record<string, any>;
  key?: string | number;
  id?: string | number;
  onClose?: () => void;
  kind?: 'flow' | 'confirm' | 'inspect' | 'edit';
  dismiss?: 'backdrop' | 'explicit' | 'confirmIfDirty';
  isDirty?: boolean;
  /**
   * Groups popup entries that belong to the same flow instance.
   * Used for flow-scoped dirty-state handling across stack navigation.
   */
  flowId?: string;
  confirmDiscardMessage?: string;
};

export const popupState = $state({
  content: null as PopupContentDefinition | null,
  stack: [] as PopupContentDefinition[],
});

/**
 * Convenience wrapper: opens a popup pre-configured as a flow popup
 * (kind='flow', dismiss='explicit').
 */
export function openFlowPopup(def: PopupContentDefinition): void {
  popupControls.open({
    kind: 'flow',
    dismiss: 'explicit',
    props: {},
    ...def,
  });
}

export const popupControls = {
  open(content: PopupContentDefinition) {
    if (popupState.content) {
      popupState.stack.push(popupState.content);
    }
    popupState.content = content;
  },

  close() {
    try {
      popupState.content?.onClose?.();
    } catch (e) {
      console.error('Popup onClose handler threw', e);
    }
    // Fire onClose for all stacked entries (e.g. flow popup underneath a success popup)
    for (const entry of popupState.stack) {
      try {
        entry.onClose?.();
      } catch (e) {
        console.error('Stacked popup onClose handler threw', e);
      }
    }
    popupState.content = null;
    popupState.stack = [];
  },

  back() {
    if (popupState.stack.length === 0) return;
    popupState.content = popupState.stack.pop() ?? null;
  },

  /**
   * Replace the current popup content without modifying the stack.
   */
  replace(content: PopupContentDefinition) {
    popupState.content = content;
  },

  /**
   * Walk the stack backwards looking for an entry that matches `predicate`.
   * If found, pop back to it (discarding entries above) and return true.
   * If not found, return false and leave the stack unchanged.
   */
  popTo(predicate: (entry: PopupContentDefinition) => boolean): boolean {
    // Build the full ordered list: [...stack, content]
    const entries: PopupContentDefinition[] = popupState.content
      ? [...popupState.stack, popupState.content]
      : [...popupState.stack];

    let foundIndex = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (predicate(entries[i])) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) return false;

    popupState.content = entries[foundIndex];
    popupState.stack = entries.slice(0, foundIndex);
    return true;
  },
};
