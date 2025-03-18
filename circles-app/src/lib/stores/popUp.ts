import { writable } from 'svelte/store';
import type { Component } from 'svelte';

export type PopupContentDefinition<T extends Record<string, any> = any> = {
  title: string;
  component: Component<T>;
  props?: Record<string, any>;
};

export const popupState = writable<{
  content: PopupContentDefinition | null;
  stack: PopupContentDefinition[];
}>({
  content: null,
  stack: [],
});

export const popupControls = {
  open: (content: PopupContentDefinition) => {
    popupState.update((state) => {
      if (state.content) {
        state.stack.push(state.content);
      }
      const updatedState = { ...state, content };
      return updatedState;
    });
  },
  close: () => {
    popupState.update((state) => ({
      ...state,
      content: null,
      stack: [],
    }));
  },
  back: () => {
    popupState.update((state) => {
      if (state.stack.length === 0) {
        console.warn('No previous content to go back to.');
        return state;
      }
      const previousContent = state.stack.pop() || null;
      return { ...state, content: previousContent };
    });
  },
};
