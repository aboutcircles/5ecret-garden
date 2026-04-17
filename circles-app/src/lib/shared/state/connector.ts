import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';

const CONNECTOR_ID_STORAGE_KEY = 'connectorId';

const connectorId = writable<string | null>(
  browser ? window.localStorage.getItem(CONNECTOR_ID_STORAGE_KEY) : null,
);

connectorId.subscribe((value) => {
  if (!browser) return;
  if (!value) {
    window.localStorage.removeItem(CONNECTOR_ID_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(CONNECTOR_ID_STORAGE_KEY, value);
});

export const connectorIdStore = {
  subscribe: connectorId.subscribe,
};

export function getConnectorId(): string | null {
  return get(connectorId);
}

export function setConnectorId(value: string): void {
  connectorId.set(value);
}

export function clearConnectorId(): void {
  connectorId.set(null);
}
