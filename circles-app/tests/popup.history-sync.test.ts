import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  initPopupHistorySync,
  popupControls,
  popupState,
  syncPopupHistoryToCurrentDepth,
} from '../src/lib/shared/state/popup';

const COMPONENT_A = {} as any;
const COMPONENT_B = {} as any;

type PopStateListener = (event: PopStateEvent) => void;

function setupFakeWindow() {
  const listeners = new Map<string, Set<(event: any) => void>>();

  const entries: Record<string, unknown>[] = [{}];
  let index = 0;

  const dispatchPopState = (state: any) => {
    for (const listener of listeners.get('popstate') ?? []) {
      (listener as PopStateListener)({ state } as PopStateEvent);
    }
  };

  const history = {
    get state() {
      return entries[index];
    },
    pushState: vi.fn((state: any) => {
      entries.splice(index + 1);
      entries.push({ ...(state ?? {}) });
      index = entries.length - 1;
    }),
    replaceState: vi.fn((state: any) => {
      entries[index] = { ...(state ?? {}) };
    }),
    back: vi.fn(() => {
      if (index <= 0) return;
      index -= 1;
      dispatchPopState(entries[index]);
    }),
    go: vi.fn((delta: number) => {
      if (!Number.isFinite(delta)) return;
      const target = index + Math.trunc(delta);
      if (target < 0 || target >= entries.length) return;
      index = target;
      dispatchPopState(entries[index]);
    }),
  };

  const fakeWindow = {
    history,
    location: { href: 'https://example.com/dashboard' },
    addEventListener(type: string, listener: (event: any) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: (event: any) => void) {
      listeners.get(type)?.delete(listener);
    },
    dispatchPopState,
    getHistoryIndex() {
      return index;
    },
    getHistoryLength() {
      return entries.length;
    },
  };

  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = fakeWindow;

  return {
    fakeWindow,
    restore() {
      (globalThis as any).window = originalWindow;
    },
  };
}

afterEach(() => {
  popupState.set({ content: null, stack: [] });
});

describe('popup history sync', () => {
  it('applies popstate depth changes to popup stack', () => {
    const { fakeWindow, restore } = setupFakeWindow();
    const dispose = initPopupHistorySync();

    popupControls.open({ title: 'A', component: COMPONENT_A, props: {} });
    popupControls.open({ title: 'B', component: COMPONENT_B, props: {} });

    const marker = fakeWindow.history.state?.__circlesPopupHistory as Record<string, unknown>;
    expect(marker?.depth).toBe(2);

    fakeWindow.dispatchPopState({
      ...fakeWindow.history.state,
      __circlesPopupHistory: { ...marker, depth: 1 },
    });

    let state = get(popupState);
    expect(state.stack).toHaveLength(0);
    expect(state.content?.component).toBe(COMPONENT_A);

    fakeWindow.dispatchPopState({
      ...fakeWindow.history.state,
      __circlesPopupHistory: { ...marker, depth: 0 },
    });

    state = get(popupState);
    expect(state.content).toBeNull();
    expect(state.stack).toHaveLength(0);

    dispose();
    restore();
  });

  it('uses history.back when popup back is triggered', () => {
    const { fakeWindow, restore } = setupFakeWindow();
    const dispose = initPopupHistorySync();

    popupControls.open({ title: 'A', component: COMPONENT_A, props: {} });
    popupControls.back();

    expect(fakeWindow.history.back).toHaveBeenCalledTimes(1);
    expect(get(popupState).content).toBeNull();

    dispose();
    restore();
  });

  it('navigates one popup step per back and closes without extra page back', () => {
    const { fakeWindow, restore } = setupFakeWindow();
    const dispose = initPopupHistorySync();

    popupControls.open({ title: 'A', component: COMPONENT_A, props: {} });
    popupControls.open({ title: 'B', component: COMPONENT_B, props: {} });

    expect(fakeWindow.getHistoryLength()).toBe(3);
    expect(fakeWindow.getHistoryIndex()).toBe(2);
    expect(get(popupState).stack).toHaveLength(1);

    popupControls.back();

    expect(fakeWindow.history.back).toHaveBeenCalledTimes(1);
    expect(fakeWindow.getHistoryIndex()).toBe(1);
    expect(get(popupState).stack).toHaveLength(0);
    expect(get(popupState).content?.component).toBe(COMPONENT_A);

    popupControls.close();

    expect(fakeWindow.history.go).toHaveBeenCalledWith(-1);
    expect(fakeWindow.getHistoryIndex()).toBe(0);
    expect(get(popupState).content).toBeNull();
    expect(get(popupState).stack).toHaveLength(0);

    dispose();
    restore();
  });

  it('keeps marker depth in sync when popup is closed via direct state update', () => {
    const { fakeWindow, restore } = setupFakeWindow();
    const dispose = initPopupHistorySync();

    popupControls.open({ title: 'A', component: COMPONENT_A, props: {} });
    popupControls.open({ title: 'B', component: COMPONENT_B, props: {} });

    let marker = fakeWindow.history.state?.__circlesPopupHistory as Record<string, unknown>;
    expect(marker?.depth).toBe(2);

    popupState.set({ content: null, stack: [] });

    marker = fakeWindow.history.state?.__circlesPopupHistory as Record<string, unknown>;
    expect(marker?.depth).toBe(0);

    dispose();
    restore();
  });

  it('keeps marker depth in sync when replacing step content', () => {
    const { fakeWindow, restore } = setupFakeWindow();
    const dispose = initPopupHistorySync();

    popupControls.open({ title: 'A', component: COMPONENT_A, props: {} });
    popupControls.replace({ title: 'B', component: COMPONENT_B, props: {} });

    const marker = fakeWindow.history.state?.__circlesPopupHistory as Record<string, unknown>;
    expect(marker?.depth).toBe(1);
    expect(get(popupState).content?.component).toBe(COMPONENT_B);

    dispose();
    restore();
  });

  it('allows manual marker resync helper to be called safely', () => {
    const { fakeWindow, restore } = setupFakeWindow();
    const dispose = initPopupHistorySync();

    popupControls.open({ title: 'A', component: COMPONENT_A, props: {} });
    syncPopupHistoryToCurrentDepth();

    const marker = fakeWindow.history.state?.__circlesPopupHistory as Record<string, unknown>;
    expect(marker?.depth).toBe(1);

    dispose();
    restore();
  });
});
