import { writable } from 'svelte/store';
import type { SvelteComponent } from 'svelte';

export type PopupContentDefinition = {
  title: string;
  component: typeof SvelteComponent<any>;
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
