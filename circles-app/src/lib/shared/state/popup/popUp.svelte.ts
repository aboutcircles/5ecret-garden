import type { Component } from 'svelte';

export type PopupContentDefinition<T extends Record<string, any> = any> = {
  title: string;
  component: Component<T>;
  props?: Record<string, any>;
  onClose?: () => void;
};

export const popupState = $state({
  content: null as PopupContentDefinition | null,
  stack: [] as PopupContentDefinition[],
});

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
    popupState.content = null;
    popupState.stack = [];
  },

  back() {
    if (popupState.stack.length === 0) return;
    popupState.content = popupState.stack.pop() ?? null;
  },
};
