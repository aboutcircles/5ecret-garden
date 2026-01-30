<!-- lib/profile/ProfileNamespaces.svelte -->
<script lang="ts">
    import {createEventDispatcher} from 'svelte';
    import {runTask} from '$lib/utils/tasks';
    import type {Address} from "@circles-sdk/utils";
    import type {CidV0} from '$lib/offers/cid';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import {
        loadNamespaceLinks,
        rewriteNamespaceFromLinks,
        type LoadedNamespaceLink
    } from '$lib/profile/namespacesEditor';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { ChevronRight as LChevronRight, ChevronDown as LChevronDown, Trash2 as LTrash2, ExternalLink as LExternalLink } from 'lucide';
    import { ipfsGatewayUrl } from '$lib/utils/ipfs';
    import JumpLink from '$lib/components/jump/JumpLink.svelte';
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
        <div class="rounded-md border border-base-content/10 bg-base-200/30 overflow-hidden">
            <button class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-base-200/50 transition-colors" onclick={() => toggleNamespace(ns)}>
                <div class="flex items-center gap-3">
                    <div class="text-base-content/50">
                        {#if state.expanded}
                            <Lucide icon={LChevronDown} size={18} />
                        {:else}
                            <Lucide icon={LChevronRight} size={18} />
                        {/if}
                    </div>
                    <Avatar address={ns} view="horizontal" clickable={true} />
                </div>
                <div class="text-xs font-medium">
                    {#if state.loading} 
                        <span class="loading loading-spinner loading-xs text-primary"></span>
                    {:else if state.error} 
                        <span class="text-error">{state.error}</span>
                    {:else} 
                        <span class="opacity-50">{state.links.length} items</span>
                    {/if}
                </div>
            </button>

            {#if state.expanded}
                <div class="px-2 pb-2 space-y-1 bg-base-100/40 border-t border-base-content/5">
                    {#each state.links as item, i (i)}
                        <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-base-200/80 transition-all group">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2 mb-0.5">
                                    <span class="text-xs font-semibold truncate">
                                        {item.link.name || 'Unnamed Link'}
                                    </span>
                                    <span class="text-[10px] font-mono opacity-30 truncate">
                                        {prettyIpfsCid(item.chunkCid)}
                                    </span>
                                </div>
                                <div class="text-[11px] opacity-60 truncate">
                                    {typeof item.link === 'object' ? JSON.stringify(item.link) : item.link}
                                </div>
                            </div>
                            
                            <div class="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <JumpLink
                                   className="btn btn-ghost btn-xs btn-square"
                                   url={ipfsGatewayUrl(item.chunkCid)}
                                   title="View on IPFS">
                                    <Lucide icon={LExternalLink} size={14} />
                                </JumpLink>
                                {#if !readonly}
                                    <button class="btn btn-ghost btn-xs btn-square text-error/70 hover:text-error" 
                                            title="Remove" 
                                            onclick={() => removeLink(ns, i)}>
                                        <Lucide icon={LTrash2} size={14} />
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                    {#if state.links.length === 0 && !state.loading}
                        <div class="py-4 text-center text-xs opacity-40 italic">No links found in this namespace.</div>
                    {/if}
                </div>
            {/if}
        </div>
    {/each}
</div>
