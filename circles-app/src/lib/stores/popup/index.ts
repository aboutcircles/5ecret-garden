import { writable, type Writable } from 'svelte/store';

export type PopupContentDefinition = {
  title?: string;
  component: any; // Svelte component constructor (kept loose for app-wide compatibility)
  props?: Record<string, any>;
  key?: string | number;
  id?: string | number;
};

export type PopupState = {
  content: PopupContentDefinition | null;
  stack: PopupContentDefinition[];
};

const initialState: PopupState = { content: null, stack: [] };

export const popupState: Writable<PopupState> = writable<PopupState>(initialState);

function open(def: PopupContentDefinition): void {
  // Push current content to stack so Back works
  popupState.update((s) => {
    const stack = s.content ? [...s.stack, s.content] : s.stack.slice();
    return { content: def, stack };
  });
}

function back(): void {
  popupState.update((s) => {
    if (!s.stack.length) return { content: null, stack: [] };
    const stack = s.stack.slice();
    const content = stack.pop() ?? null;
    return { content, stack };
  });
}

function close(): void {
  popupState.set({ content: null, stack: [] });
}

function replace(def: PopupContentDefinition): void {
  // Replace current content without changing the stack
  popupState.update((s) => ({ content: def, stack: s.stack.slice() }));
}

export const popupControls = { open, back, close, replace };
