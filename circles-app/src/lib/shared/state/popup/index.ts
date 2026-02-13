import { writable, type Writable } from 'svelte/store';

export type PopupContentDefinition = {
  title?: string;
  /**
   * If true, the popup shell will not render the title text (useful when the inner component already has its own header).
   */
  hideTitle?: boolean;
  component: any; // Svelte component constructor (kept loose for app-wide compatibility)
  props?: Record<string, any>;
  key?: string | number;
  id?: string | number;
  onClose?: () => void;
  kind?: 'flow' | 'confirm' | 'inspect' | 'edit';
  dismiss?: 'backdrop' | 'explicit' | 'confirmIfDirty';
  isDirty?: boolean;
  confirmDiscardMessage?: string;
};

export function resolvePopupDismiss(def: PopupContentDefinition | null | undefined): NonNullable<PopupContentDefinition['dismiss']> {
  if (!def) return 'explicit';
  if (def.dismiss) return def.dismiss;
  if (!def.kind) return 'backdrop';
  if (def.kind === 'inspect') return 'backdrop';
  return 'explicit';
}

export type PopupState = {
  content: PopupContentDefinition | null;
  stack: PopupContentDefinition[];
};

const initialState: PopupState = { content: null, stack: [] };

export const popupState: Writable<PopupState> = writable<PopupState>(initialState);
let popupIdentitySeq = 0;

function normalizePopupDefinition(def: PopupContentDefinition): PopupContentDefinition {
  const hasStableIdentity = def.key != null || def.id != null;
  return {
    ...(hasStableIdentity ? {} : { key: `popup-${++popupIdentitySeq}` }),
    ...def,
    isDirty: def.isDirty ?? false,
  };
}

function open(def: PopupContentDefinition): void {
  // Push current content to stack so Back works
  popupState.update((s) => {
    const next = normalizePopupDefinition(def);
    const stack = s.content ? [...s.stack, s.content] : s.stack.slice();
    return { content: next, stack };
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

function popTo(predicate: (entry: PopupContentDefinition) => boolean): boolean {
  let found = false;

  popupState.update((s) => {
    const entries = s.content ? [...s.stack, s.content] : s.stack.slice();

    let foundIndex = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (predicate(entries[i])) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      return s;
    }

    found = true;
    return {
      content: entries[foundIndex],
      stack: entries.slice(0, foundIndex),
    };
  });

  return found;
}

function close(): void {
  popupState.update((s) => {
    s.content?.onClose?.();
    return { content: null, stack: [] };
  });
}

function replace(def: PopupContentDefinition): void {
  // Replace current content without changing the stack
  popupState.update((s) => ({ content: normalizePopupDefinition(def), stack: s.stack.slice() }));
}

function setCurrentDirty(isDirty: boolean): void {
  popupState.update((s) => {
    if (!s.content) return s;
    if ((s.content.isDirty ?? false) === isDirty) return s;
    return {
      content: { ...s.content, isDirty },
      stack: s.stack.slice(),
    };
  });
}

function markCurrentDirty(): void {
  setCurrentDirty(true);
}

function markCurrentPristine(): void {
  setCurrentDirty(false);
}

export function openFlowPopup(def: PopupContentDefinition): void {
  popupControls.open({
    kind: 'flow',
    dismiss: 'explicit',
    props: {},
    ...def,
  });
}

export const popupControls = {
  open,
  back,
  popTo,
  close,
  replace,
  setCurrentDirty,
  markCurrentDirty,
  markCurrentPristine,
};
