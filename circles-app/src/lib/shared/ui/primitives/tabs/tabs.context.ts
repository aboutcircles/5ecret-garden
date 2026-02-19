import type { Readable } from 'svelte/store';

export type TabRegistration = {
    id: string;
    title: string;
    disabled: boolean;
    badge?: number | string;
};

export type TabsContext = {
    register(info: TabRegistration): () => void;
    isSelected(id: string): boolean;
    select(id: string, focus?: boolean): void;

    // Optional reactive bits so children can update when selection changes.
    selected$?: Readable<string | null>;
    hostId?: string;
};

export const TABS_CTX = Symbol('TabsContext');
