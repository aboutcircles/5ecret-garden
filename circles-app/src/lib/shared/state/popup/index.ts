import { get, writable, type Writable } from 'svelte/store';

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
  /**
   * Groups popup entries that belong to the same flow instance.
   * Used for flow-scoped dirty-state handling across stack navigation.
   */
  flowId?: string;
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

type PopupHistoryMarker = {
  sessionId: string;
  depth: number;
};

const initialState: PopupState = { content: null, stack: [] };

export const popupState: Writable<PopupState> = writable<PopupState>(initialState);
let popupIdentitySeq = 0;
let popupFlowIdentitySeq = 0;
let popupHistorySyncSessionId: string | null = null;
let popupHistorySyncHandlingPopstate = false;
let popupHistorySyncCleanup: (() => void) | null = null;
let popupHistorySyncUnsubscribe: (() => void) | null = null;
let popupHistorySyncSkipStateSync = false;

const POPUP_HISTORY_STATE_KEY = '__circlesPopupHistory';

function supportsBrowserHistory(): boolean {
  return typeof window !== 'undefined' && typeof window.history !== 'undefined';
}

function currentDepth(state: PopupState): number {
  return state.content ? state.stack.length + 1 : 0;
}

function entriesFor(state: PopupState): PopupContentDefinition[] {
  return state.content ? [...state.stack, state.content] : state.stack.slice();
}

function applyDepth(targetDepth: number): void {
  popupState.update((s) => {
    const entries = entriesFor(s);
    const clamped = Math.max(0, Math.min(targetDepth, entries.length));

    if (clamped === entries.length) {
      return s;
    }

    if (clamped === 0) {
      s.content?.onClose?.();
      return { content: null, stack: [] };
    }

    return {
      content: entries[clamped - 1],
      stack: entries.slice(0, clamped - 1),
    };
  });
}

function readPopupHistoryMarker(state: any): PopupHistoryMarker | null {
  if (!popupHistorySyncSessionId || !state || typeof state !== 'object') {
    return null;
  }

  const raw = (state as Record<string, unknown>)[POPUP_HISTORY_STATE_KEY];
  if (!raw || typeof raw !== 'object') return null;

  const marker = raw as Record<string, unknown>;
  if (marker.sessionId !== popupHistorySyncSessionId) return null;
  if (typeof marker.depth !== 'number') return null;

  return {
    sessionId: marker.sessionId,
    depth: Math.max(0, Math.trunc(marker.depth)),
  };
}

function writePopupHistoryDepth(depth: number, mode: 'push' | 'replace'): void {
  if (!supportsBrowserHistory() || !popupHistorySyncSessionId) return;

  const nextState = {
    ...(window.history.state ?? {}),
    [POPUP_HISTORY_STATE_KEY]: {
      sessionId: popupHistorySyncSessionId,
      depth,
    },
  };

  if (mode === 'push') {
    window.history.pushState(nextState, '', window.location.href);
    return;
  }

  window.history.replaceState(nextState, '', window.location.href);
}

function hasActivePopupHistorySync(): boolean {
  return supportsBrowserHistory() && popupHistorySyncSessionId !== null;
}

export function syncPopupHistoryToCurrentDepth(): void {
  if (!hasActivePopupHistorySync() || popupHistorySyncHandlingPopstate || popupHistorySyncSkipStateSync) {
    return;
  }

  const depth = currentDepth(get(popupState));
  const marker = readPopupHistoryMarker(window.history.state);
  if (marker && marker.depth === depth) {
    return;
  }

  writePopupHistoryDepth(depth, 'replace');
}

function nextFlowId(): string {
  popupFlowIdentitySeq += 1;
  return `flow-${popupFlowIdentitySeq}`;
}

function resolveFlowId(
  def: PopupContentDefinition,
  current: PopupContentDefinition | null
): string | undefined {
  if (def.flowId) {
    return String(def.flowId);
  }
  if (def.kind !== 'flow') {
    return undefined;
  }

  if (current?.kind === 'flow' && current.flowId) {
    return String(current.flowId);
  }

  return nextFlowId();
}

function normalizePopupDefinition(
  def: PopupContentDefinition,
  current: PopupContentDefinition | null
): PopupContentDefinition {
  const hasStableIdentity = def.key != null || def.id != null;
  return {
    ...(hasStableIdentity ? {} : { key: `popup-${++popupIdentitySeq}` }),
    ...def,
    isDirty: def.isDirty ?? false,
    flowId: resolveFlowId(def, current),
  };
}

function open(def: PopupContentDefinition): void {
  // Push current content to stack so Back works
  popupHistorySyncSkipStateSync = true;
  popupState.update((s) => {
    const next = normalizePopupDefinition(def, s.content);
    const stack = s.content ? [...s.stack, s.content] : s.stack.slice();
    return { content: next, stack };
  });
  popupHistorySyncSkipStateSync = false;

  if (!hasActivePopupHistorySync() || popupHistorySyncHandlingPopstate) return;
  const depth = currentDepth(get(popupState));
  writePopupHistoryDepth(depth, 'push');
}

function back(): void {
  if (hasActivePopupHistorySync() && !popupHistorySyncHandlingPopstate) {
    const depth = currentDepth(get(popupState));
    const marker = readPopupHistoryMarker(window.history.state);
    if (depth > 0 && marker && marker.depth > 0) {
      window.history.back();
      return;
    }
  }

  popupState.update((s) => {
    if (!s.stack.length) return { content: null, stack: [] };
    const stack = s.stack.slice();
    const content = stack.pop() ?? null;
    return { content, stack };
  });
  syncPopupHistoryToCurrentDepth();
}

function popTo(predicate: (entry: PopupContentDefinition) => boolean): boolean {
  let found = false;

  if (hasActivePopupHistorySync() && !popupHistorySyncHandlingPopstate) {
    const s = get(popupState);
    const entries = entriesFor(s);
    let foundIndex = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (predicate(entries[i])) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      found = true;
      const targetDepth = foundIndex + 1;
      const delta = entries.length - targetDepth;
      const marker = readPopupHistoryMarker(window.history.state);
      if (delta > 0 && marker && marker.depth >= entries.length) {
        window.history.go(-delta);
        return true;
      }
    }
  }

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

  syncPopupHistoryToCurrentDepth();

  return found;
}

function close(): void {
  if (hasActivePopupHistorySync() && !popupHistorySyncHandlingPopstate) {
    const depth = currentDepth(get(popupState));
    const marker = readPopupHistoryMarker(window.history.state);
    if (depth > 0 && marker && marker.depth >= depth) {
      window.history.go(-depth);
      return;
    }
  }

  popupState.update((s) => {
    s.content?.onClose?.();
    return { content: null, stack: [] };
  });
  syncPopupHistoryToCurrentDepth();
}

function replace(def: PopupContentDefinition): void {
  // Replace current content without changing the stack
  popupState.update((s) => ({ content: normalizePopupDefinition(def, s.content), stack: s.stack.slice() }));
  syncPopupHistoryToCurrentDepth();
}

function isDirty(entry: PopupContentDefinition | null | undefined): boolean {
  return (entry?.isDirty ?? false) === true;
}

export function isCurrentFlowDirty(state: PopupState): boolean {
  const content = state.content;
  if (!content) return false;

  if (content.kind !== 'flow' || !content.flowId) {
    return isDirty(content);
  }

  const flowId = String(content.flowId);
  if (isDirty(content)) {
    return true;
  }

  return state.stack.some((entry) => entry.kind === 'flow' && String(entry.flowId ?? '') === flowId && isDirty(entry));
}

function setCurrentDirty(isDirty: boolean): void {
  popupState.update((s) => {
    const content = s.content;
    if (!content) return s;

    const activeFlowId = content.kind === 'flow' && content.flowId ? String(content.flowId) : null;
    if (!activeFlowId) {
      if ((content.isDirty ?? false) === isDirty) return s;
      return {
        content: { ...content, isDirty },
        stack: s.stack.slice(),
      };
    }

    let changed = false;
    const mapEntry = (entry: PopupContentDefinition): PopupContentDefinition => {
      if (entry.kind !== 'flow' || String(entry.flowId ?? '') !== activeFlowId) {
        return entry;
      }
      if ((entry.isDirty ?? false) === isDirty) {
        return entry;
      }
      changed = true;
      return { ...entry, isDirty };
    };

    const nextContent = mapEntry(content);
    const nextStack = s.stack.map(mapEntry);
    if (!changed) {
      return s;
    }
    return { content: nextContent, stack: nextStack };
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

export function initPopupHistorySync(): () => void {
  if (!supportsBrowserHistory()) {
    return () => {};
  }

  if (popupHistorySyncCleanup) {
    return popupHistorySyncCleanup;
  }

  popupHistorySyncSessionId = `popup-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  syncPopupHistoryToCurrentDepth();
  popupHistorySyncUnsubscribe = popupState.subscribe(() => {
    syncPopupHistoryToCurrentDepth();
  });

  const onPopState = (event: PopStateEvent): void => {
    if (!popupHistorySyncSessionId) return;

    const marker = readPopupHistoryMarker(event.state);
    const targetDepth = marker?.depth ?? 0;
    const current = currentDepth(get(popupState));

    if (targetDepth === current) {
      return;
    }

    if (targetDepth > current) {
      // We don't persist full popup component snapshots in history.
      // If browser forward reaches a popup-depth marker, normalize back
      // to the actual runtime popup depth.
      writePopupHistoryDepth(current, 'replace');
      return;
    }

    popupHistorySyncHandlingPopstate = true;
    try {
      applyDepth(targetDepth);
    } finally {
      popupHistorySyncHandlingPopstate = false;
    }
  };

  window.addEventListener('popstate', onPopState);

  popupHistorySyncCleanup = () => {
    window.removeEventListener('popstate', onPopState);
    popupHistorySyncUnsubscribe?.();
    popupHistorySyncUnsubscribe = null;
    popupHistorySyncSessionId = null;
    popupHistorySyncHandlingPopstate = false;
    popupHistorySyncCleanup = null;
  };

  return popupHistorySyncCleanup;
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
