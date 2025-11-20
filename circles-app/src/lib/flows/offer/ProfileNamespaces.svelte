<!-- lib/flows/profile/ProfileNamespaces.svelte -->
<script lang="ts">
    import {createEventDispatcher} from 'svelte';
    import {runTask} from '$lib/utils/tasks';
    import {circles} from '$lib/stores/circles';
    import type {Address} from "@circles-sdk/utils";
    import type {CidV0} from '$lib/offers/cid';
    import type {CirclesBindings} from '$lib/offers/namespaces';
    import {
        loadNamespaceLinks,
        rewriteNamespaceFromLinks,
        type LoadedNamespaceLink
    } from './namespacesEditor';
    import {get} from 'svelte/store';
    import Avatar from '$lib/components/avatar/Avatar.svelte';

    interface Props {
        avatar: Address;
        pinApiBase?: string;
        namespaces: Record<string, string>;
        readonly?: boolean;
    }

    let {avatar, pinApiBase, namespaces, readonly = false}: Props = $props();

    const dispatch = createEventDispatcher<{ namespacesChanged: Record<string, string> }>();

    const circlesVal = $state(get(circles));

    type NamespaceState = {
        loading: boolean;
        error: string | null;
        links: LoadedNamespaceLink[];
        expanded: boolean;
    };

    let perNamespace = $state<Record<string, NamespaceState>>({});

    function mkBindings(): CirclesBindings {
        if (!circlesVal) {
            throw new Error('Circles SDK not initialized');
        }
        if (!circlesVal.profiles) {
            throw new Error('Profiles service not configured');
        }

        const base = (pinApiBase ?? '').replace(/\/$/, '');
        const pinUrl = base ? `${base}/api/pin` : '';

        if (!pinUrl) {
            throw new Error('pinApiBase not provided; cannot call /api/pin');
        }

        const bindings: CirclesBindings = {
            async getLatestProfileCid(av: string): Promise<CidV0 | null> {
                const cid = await circlesVal.data.getMetadataCidForAddress(av as Address);
                return (cid as CidV0 | null) ?? null;
            },
            async getProfile(cid: CidV0): Promise<any | null> {
                try {
                    return await circlesVal.profiles!.get(cid);
                } catch {
                    return null;
                }
            },
            async putJsonLd(obj: any): Promise<CidV0> {
                const res = await fetch(pinUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/ld+json; charset=utf-8',
                        Accept: 'application/ld+json'
                    },
                    body: JSON.stringify(obj)
                });

                if (!res.ok) {
                    let detail = '';
                    try {
                        detail = await res.text();
                    } catch {
                        // ignore
                    }

                    throw new Error(
                        `Pin API error ${res.status}: ${detail || res.statusText}`
                    );
                }

                const body = (await res.json().catch(() => ({} as any))) as any;
                const cid = body?.cid as string | undefined;
                const looksCidV0 =
                    typeof cid === 'string' && /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);

                if (!looksCidV0) {
                    throw new Error(`Pin API returned invalid cid: ${String(cid)}`);
                }

                return cid as CidV0;
            },
            async updateAvatarProfileDigest(av: string, cid: CidV0): Promise<string> {
                const avatarObj = await circlesVal.getAvatar(av as Address);
                const tx = await avatarObj.updateMetadata(cid);
                return ((tx as any)?.hash ?? '') as string;
            },
            // canonicalizeJsonLd is not needed here
        };

        return bindings;
    }

    function ensureNamespaceState(key: string): NamespaceState {
        const existing = perNamespace[key];
        if (existing) {
            return existing;
        }
        const ns: NamespaceState = {
            loading: false,
            error: null,
            links: [],
            expanded: false
        };
        perNamespace = {...perNamespace, [key]: ns};
        return ns;
    }

    async function toggleNamespace(key: string): Promise<void> {
        const state = ensureNamespaceState(key);
        const nextExpanded = !state.expanded;

        perNamespace = {
            ...perNamespace,
            [key]: {...state, expanded: nextExpanded}
        };

        if (!nextExpanded) {
            return;
        }

        const alreadyLoaded = state.links.length > 0;
        const alreadyLoading = state.loading;
        if (alreadyLoaded || alreadyLoading) {
            return;
        }

        const bindings = mkBindings();
        const indexCid = namespaces[key] as CidV0 | undefined;

        if (!indexCid) {
            perNamespace = {
                ...perNamespace,
                [key]: {...state, links: [], error: null, loading: false, expanded: true}
            };
            return;
        }

        perNamespace = {
            ...perNamespace,
            [key]: {...state, loading: true, error: null, expanded: true}
        };

        try {
            const {links} = await loadNamespaceLinks(bindings, indexCid);
            perNamespace = {
                ...perNamespace,
                [key]: {
                    ...ensureNamespaceState(key),
                    loading: false,
                    error: null,
                    links,
                    expanded: true
                }
            };
        } catch (e: any) {
            perNamespace = {
                ...perNamespace,
                [key]: {
                    ...ensureNamespaceState(key),
                    loading: false,
                    error: String(e?.message ?? e),
                    links: [],
                    expanded: true
                }
            };
        }
    }

    function openPayload(cid: string): void {
        const hasCid = typeof cid === 'string' && cid.length > 0;
        if (!hasCid) {
            return;
        }
        const url = `https://ipfs.io/ipfs/${cid}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    async function removeLink(nsKey: string, idx: number): Promise<void> {
        if (readonly) return;
        const state = ensureNamespaceState(nsKey);
        const existing = state.links;

        const outOfRange = idx < 0 || idx >= existing.length;
        if (outOfRange) {
            return;
        }

        const remaining = existing.filter((_, i) => i !== idx);
        const bindings = mkBindings();

        await runTask({
            name: 'Updating namespace…',
            promise: (async () => {
                const remainingLinks = remaining.map((x) => x.link);
                const {indexCid} = await rewriteNamespaceFromLinks(
                    bindings,
                    avatar,
                    nsKey as Address,
                    remainingLinks
                );

                const nextNamespaces = {...namespaces};
                if (indexCid) {
                    nextNamespaces[nsKey] = indexCid;
                } else {
                    delete nextNamespaces[nsKey];
                }

                namespaces = nextNamespaces;
                dispatch('namespacesChanged', nextNamespaces);

                if (indexCid) {
                    perNamespace = {
                        ...perNamespace,
                        [nsKey]: {
                            ...state,
                            links: remaining,
                            error: null,
                            expanded: true,
                            loading: false
                        }
                    };
                } else {
                    const nsCopy = {...perNamespace};
                    delete nsCopy[nsKey];
                    perNamespace = nsCopy;
                }
            })()
        });
    }

    async function removeNamespace(nsKey: string): Promise<void> {
        if (readonly) return;
        ensureNamespaceState(nsKey);
        const bindings = mkBindings();

        await runTask({
            name: 'Removing namespace…',
            promise: (async () => {
                await rewriteNamespaceFromLinks(bindings, avatar, nsKey as Address, []);

                const nextNamespaces = {...namespaces};
                delete nextNamespaces[nsKey];
                namespaces = nextNamespaces;
                dispatch('namespacesChanged', nextNamespaces);

                const nsCopy = {...perNamespace};
                delete nsCopy[nsKey];
                perNamespace = nsCopy;
            })()
        });
    }
</script>

{#if Object.keys(namespaces).length === 0}
    <div class="text-sm opacity-70">No namespaces.</div>
{:else}
    <div class="space-y-2 text-xs">
        {#each Object.entries(namespaces) as [addr, idxCid]}
            {#key addr}
                <div class="border rounded-lg p-2 bg-base-100/60">
                    <div class="flex items-center gap-3">
                        <button
                                type="button"
                                class="btn btn-xs btn-ghost"
                                on:click={() => toggleNamespace(addr)}
                        >
                            {#if perNamespace[addr]?.expanded}▾{:else}▸{/if}
                        </button>

                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <!-- Avatar / profile summary for namespace key -->
                            <Avatar address={addr} view="horizontal" bottomInfo={`index: ${idxCid}`} />
                        </div>

                        {#if !readonly}
                        <button
                                type="button"
                                class="btn btn-xs btn-outline"
                                on:click={() => removeNamespace(addr)}
                        >
                            Remove namespace
                        </button>
                        {/if}
                    </div>

                    {#if perNamespace[addr]?.expanded}
                        <div class="mt-2 pl-7 space-y-1">
                            {#if perNamespace[addr]?.loading}
                                <div class="opacity-70">Loading links…</div>
                            {:else if perNamespace[addr]?.error}
                                <div class="text-error">
                                    Failed to load links: {perNamespace[addr]?.error}
                                </div>
                            {:else if (perNamespace[addr]?.links ?? []).length === 0}
                                <div class="opacity-70">No links in this namespace.</div>
                            {:else}
                                {#each perNamespace[addr].links as item, i}
                                    <div class="flex items-center gap-2">
                                        <div class="flex-1 truncate">
                                            <span class="opacity-60">{i + 1}.</span>
                                            <span class="ml-1">
                                                <code>{item.link.name}</code>
                                            </span>
                                            <span class="opacity-60"> · </span>
                                            <span class="truncate inline-block max-w-xs align-middle">
                                                <code>{item.link.cid}</code>
                                            </span>
                                            {#if item.link.signedAt}
                                                <span class="opacity-60">
                                                    · signedAt={item.link.signedAt}
                                                </span>
                                            {/if}
                                        </div>
                                        <button
                                                type="button"
                                                class="btn btn-xs"
                                                on:click={() => openPayload(item.link.cid)}
                                        >
                                            Open
                                        </button>
                                        {#if !readonly}
                                        <button
                                                type="button"
                                                class="btn btn-xs btn-outline"
                                                on:click={() => removeLink(addr, i)}
                                        >
                                            Remove
                                        </button>
                                        {/if}
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    {/if}
                </div>
            {/key}
        {/each}
    </div>
{/if}
