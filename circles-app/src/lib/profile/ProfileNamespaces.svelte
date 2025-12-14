<!-- lib/profile/ProfileNamespaces.svelte -->
<script lang="ts">
    import {createEventDispatcher} from 'svelte';
    import {runTask} from '$lib/utils/tasks';
    import {circles} from '$lib/stores/circles';
    import type {Address} from "@circles-sdk/utils";
    import type {CidV0} from '$lib/offers/cid';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import {
        loadNamespaceLinks,
        rewriteNamespaceFromLinks,
        type LoadedNamespaceLink
    } from '$lib/profile/namespacesEditor';
    import {get} from 'svelte/store';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { ChevronRight as LChevronRight, ChevronDown as LChevronDown, Trash2 as LTrash2, ExternalLink as LExternalLink } from 'lucide';
    import { ipfsGatewayUrl } from '$lib/utils/ipfs';
    import { getProfilesBindings } from '$lib/offers/profilesBindings';

    interface Props {
        avatar: Address;
        pinApiBase?: string;
        namespaces: Record<string, string>;
        readonly?: boolean;
    }

    let {avatar, pinApiBase, namespaces, readonly = false}: Props = $props();

    const dispatch = createEventDispatcher<{ namespacesChanged: Record<string, string> }>();


    type NamespaceState = {
        loading: boolean;
        error: string | null;
        links: LoadedNamespaceLink[];
        expanded: boolean;
    };

    let perNamespace = $state<Record<string, NamespaceState>>({});

    // Expand/collapse state for folders per namespace
    // Structure: { [namespaceAddr]: { [folderPath]: boolean } }
    let folderExpanded = $state<Record<string, Record<string, boolean>>>({});

    function getBindings(): ProfilesBindings {
        return getProfilesBindings({ pinApiBase }).bindings;
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

        const bindings = getBindings();
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
                [key]: {...ensureNamespaceState(key), loading: false, error: String(e?.message ?? e), expanded: true}
            };
        }
    }

    function toggleFolder(ns: string, folder: string): void {
        const perNs = folderExpanded[ns] ?? {};
        const next = { ...perNs, [folder]: !perNs[folder] };
        folderExpanded = { ...folderExpanded, [ns]: next };
    }

    function isFolderExpanded(ns: string, folder: string): boolean {
        return !!folderExpanded?.[ns]?.[folder];
    }

    function prettyIpfsCid(cid?: string | null): string {
        const c = String(cid ?? '');
        if (!c) return '';
        return c.startsWith('Qm') ? c : '';
    }

    async function removeLink(ns: string, idx: number): Promise<void> {
        if (readonly) return;
        const cur = ensureNamespaceState(ns);
        const next = cur.links.filter((_, i) => i !== idx);
        await persistLinks(ns, next);
    }

    async function persistLinks(ns: string, links: LoadedNamespaceLink[]): Promise<void> {
        if (readonly || !avatar) return;
        const bindings = getBindings();
        await runTask({
            name: 'Updating namespace…',
            promise: (async () => {
                const { indexCid } = await rewriteNamespaceFromLinks(
                    bindings,
                    avatar,
                    ns as Address,
                    links.map((l) => l.link)
                );

                const nextNs = { ...namespaces };
                if (indexCid) nextNs[ns] = indexCid;
                else delete nextNs[ns];
                namespaces = nextNs;
                dispatch('namespacesChanged', nextNs);

                // Refresh links view
                perNamespace = { ...perNamespace, [ns]: { ...ensureNamespaceState(ns), links: [], expanded: false } };
                await toggleNamespace(ns);
            })()
        });
    }
</script>

<div class="space-y-2">
    {#each Object.keys(namespaces) as ns (ns)}
        {@const state = perNamespace[ns] ?? { loading: false, error: null, links: [], expanded: false }}
        <div class="rounded-md border bg-base-100/60">
            <button class="w-full flex items-center justify-between px-3 py-2 text-left" onclick={() => toggleNamespace(ns)}>
                <div class="flex items-center gap-2">
                    {#if state.expanded}
                        <Lucide icon={LChevronDown} size={16} class="shrink-0 stroke-current" ariaLabel="" />
                    {:else}
                        <Lucide icon={LChevronRight} size={16} class="shrink-0 stroke-current" ariaLabel="" />
                    {/if}
                    <Avatar address={ns} view="horizontal" clickable={true} />
                </div>
                <div class="text-xs opacity-60">
                    {#if state.loading} Loading… {/if}
                    {#if state.error} {state.error} {/if}
                    {#if !state.loading && !state.error} {state.links.length} links {/if}
                </div>
            </button>

            {#if state.expanded}
                <div class="px-3 pb-2 space-y-1">
                    {#each state.links as item, i (i)}
                        <div class="flex items-start justify-between gap-2 px-2 py-1 rounded hover:bg-base-200/60">
                            <div class="min-w-0 flex-1">
                                <div class="font-mono text-[11px] truncate">{prettyIpfsCid(item.chunkCid)}</div>
                                <div class="text-xs break-words">{JSON.stringify(item.link)}</div>
                            </div>
                            {#if !readonly}
                                <div class="shrink-0 flex items-center gap-1">
                                    <a class="btn btn-ghost btn-xs" href={ipfsGatewayUrl(item.chunkCid)} target="_blank" rel="noreferrer" title="Open chunk on IPFS">
                                        <Lucide icon={LExternalLink} size={14} class="shrink-0 stroke-current" ariaLabel="" />
                                    </a>
                                    <button class="btn btn-ghost btn-xs" title="Remove" onclick={() => removeLink(ns, i)}>
                                        <Lucide icon={LTrash2} size={14} class="shrink-0 stroke-current" ariaLabel="" />
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/each}
</div>
