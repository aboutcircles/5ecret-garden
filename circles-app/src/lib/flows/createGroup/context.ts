import { writable } from 'svelte/store';
import type { Address } from '@circles-sdk/utils';

/** Minimal shape accepted by profiles.create() for group profiles */
export type GroupProfileShape = {
    name: string;
    symbol: string;
    description?: string;
    previewImageUrl?: string;
    imageUrl?: string;
};

export type CreateGroupFlowContext = {
    profile: GroupProfileShape;
    service: `0x${string}`;
    feeCollection: `0x${string}`;
    initialConditions: Address[];
    cid?: string;
};

export function defaultCreateGroupContext(feeCollection?: `0x${string}`): CreateGroupFlowContext {
    const zero: `0x${string}` = '0x0000000000000000000000000000000000000000';
    return {
        profile: {
            name: '',
            symbol: '',
            description: '',
            previewImageUrl: '',
            imageUrl: ''
        },
        service: zero,
        feeCollection: feeCollection ?? zero,
        initialConditions: []
    };
}

export const createGroupContext = writable<CreateGroupFlowContext>(defaultCreateGroupContext());

export function resetCreateGroupContext(feeCollection?: `0x${string}`) {
    createGroupContext.set(defaultCreateGroupContext(feeCollection));
}
