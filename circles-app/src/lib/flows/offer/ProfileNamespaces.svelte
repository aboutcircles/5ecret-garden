<!-- lib/flows/profile/ProfileNamespaces.svelte -->
<script lang="ts">
    import {createEventDispatcher} from 'svelte';
    import {runTask} from '$lib/utils/tasks';
    import {circles} from '$lib/shared/state/circles';
    import type {Address} from "@circles-sdk/utils";
    import type {CidV0} from '$lib/domains/market/offers';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import {
        loadNamespaceLinks,
        rewriteNamespaceFromLinks,
        type LoadedNamespaceLink
    } from './namespacesEditor';
    import {get} from 'svelte/store';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { ChevronRight as LChevronRight, ChevronDown as LChevronDown, Trash2 as LTrash2, ExternalLink as LExternalLink } from 'lucide';
    import { ipfsGatewayUrl } from '$lib/utils/ipfs';
    import { getProfilesBindings } from '$lib/domains/market/offers';

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
        const url = ipfsGatewayUrl(cid);
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    // ----- Folder tree helpers (Svelte 5 idiomatic snippets rendering) -----

    // Tree model
    type TreeNode = FolderNode | LinkNode;

    type FolderNode = {
        kind: 'folder';
        name: string;    // last segment
        path: string;    // full path from root
        children: TreeNode[];
    };

    type LinkNode = {
        kind: 'link';
        name: string;     // last segment
        path: string;     // full link name path
        item: LoadedNamespaceLink;
    };

    function isFolderOpen(ns: string, path: string): boolean {
        // Important: do not mutate state during render/evaluation.
        // Only read from the current snapshot; initialize lazily in event handlers.
        const nsState = folderExpanded[ns];
        return (nsState && nsState[path]) ?? false;
    }

    function toggleFolder(ns: string, path: string): void {
        const nsState = folderExpanded[ns] ?? {};
        const next = { ...nsState, [path]: !nsState[path] };
        folderExpanded = { ...folderExpanded, [ns]: next };
    }

    function buildTree(links: LoadedNamespaceLink[]): FolderNode {
        const root: FolderNode = { kind: 'folder', name: '', path: '', children: [] };

        function getOrCreateFolder(parent: FolderNode, seg: string, pathSoFar: string): FolderNode {
            const existing = parent.children.find((c): c is FolderNode => c.kind === 'folder' && c.name === seg);
            if (existing) return existing;
            const node: FolderNode = { kind: 'folder', name: seg, path: pathSoFar, children: [] };
            parent.children.push(node);
            return node;
        }

        for (const link of links) {
            const fullName = link.link.name?.trim() ?? '';
            if (!fullName) {
                root.children.push({ kind: 'link', name: '', path: '', item: link });
                continue;
            }

            const segs = fullName.split('/').filter(Boolean);
            if (segs.length === 0) {
                root.children.push({ kind: 'link', name: '', path: '', item: link });
                continue;
            }

            let parent = root;
            let acc = '';
            for (let i = 0; i < segs.length - 1; i++) {
                acc = acc ? `${acc}/${segs[i]}` : segs[i];
                parent = getOrCreateFolder(parent, segs[i], acc);
            }
            const last = segs[segs.length - 1];
            const fullPath = segs.join('/');
            parent.children.push({ kind: 'link', name: last, path: fullPath, item: link });
        }

        function sortNode(node: FolderNode) {
            node.children.sort((a, b) => {
                if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            for (const child of node.children) if (child.kind === 'folder') sortNode(child);
        }

        sortNode(root);
        return root;
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
        const bindings = getBindings();

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
        const bindings = getBindings();

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
                                onclick={() => toggleNamespace(addr)}
                        >
                            {#if perNamespace[addr]?.expanded}
                                <Lucide icon={LChevronDown} size={16} />
                            {:else}
                                <Lucide icon={LChevronRight} size={16} />
                            {/if}
                        </button>

                        <div class="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                            <!-- Avatar / profile summary for namespace key -->
                            <Avatar address={addr} view="horizontal" bottomInfo={idxCid} />
                        </div>

                        {#if !readonly}
                        <button
                                type="button"
                                class="btn btn-xs btn-ghost btn-square"
                                onclick={() => removeNamespace(addr)}
                                title="Remove namespace"
                                aria-label="Remove namespace"
                        >
                            <Lucide icon={LTrash2} size={16} />
                        </button>
                        {/if}
                    </div>

                    {#if perNamespace[addr]?.expanded}
                        <div class="mt-2 pl-7 space-y-1">
                            {#if perNamespace[addr]?.loading}
                                <div class="opacity-70" aria-live="polite">Loading links…</div>
                            {:else if perNamespace[addr]?.error}
                                <div class="text-error" role="alert" aria-live="assertive">
                                    Failed to load links: {perNamespace[addr]?.error}
                                </div>
                            {:else if (perNamespace[addr]?.links ?? []).length === 0}
                                <div class="opacity-70">No links in this namespace.</div>
                            {:else}
                                {@const root = buildTree(perNamespace[addr].links)}
                                {#if root.children.length === 0}
                                    <div class="opacity-70">No links in this namespace.</div>
                                {:else}
                                    <div class="space-y-1">
                                        {#each root.children as node}
                                            {#if node.kind === 'folder'}
                                                {@render FolderBlock({ ns: addr, node })}
                                            {:else}
                                                {@render LinkRow({ ns: addr, node })}
                                            {/if}
                                        {/each}
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    {/if}
                </div>
            {/key}
        {/each}
    </div>
{/if}

{#snippet FolderBlock({ ns, node })}
    <div class="folder pl-3">
        <div class="flex items-center gap-2 py-1">
            <button
                type="button"
                class="btn btn-ghost btn-sm md:btn-xs btn-square"
                aria-expanded={isFolderOpen(ns, node.path)}
                title={isFolderOpen(ns, node.path) ? 'Collapse folder' : 'Expand folder'}
                onclick={() => toggleFolder(ns, node.path)}
            >
                {#if isFolderOpen(ns, node.path)}
                    <Lucide icon={LChevronDown} size={16} />
                {:else}
                    <Lucide icon={LChevronRight} size={16} />
                {/if}
            </button>
            <span class="font-medium truncate">{node.name}</span>
        </div>

        {#if isFolderOpen(ns, node.path)}
            <div class="mt-1 pl-5 space-y-1">
                {#each node.children as child}
                    {#if child.kind === 'folder'}
                        {@render FolderBlock({ ns, node: child })}
                    {:else}
                        {@render LinkRow({ ns, node: child })}
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
{/snippet}

{#snippet LinkRow({ ns, node })}
    <div class="flex items-start gap-2 rounded-md px-1 py-1 hover:bg-base-200/50">
        <div class="flex-1 min-w-0">
            <!-- Primary line: filename only -->
            <div class="flex items-center min-w-0">
                <code class="truncate" title={node.path}>{node.name || node.path || '(unnamed)'}</code>
            </div>
            <!-- Secondary line: meta (CID + signedAt) -->
            <div class="text-[11px] md:text-xs opacity-70 truncate">
                <span class="truncate inline-block align-middle max-w-full">
                    <code class="truncate">{node.item.link.cid}</code>
                </span>
                {#if node.item.link.signedAt}
                    <span class="mx-1">·</span>
                    <span>signedAt={node.item.link.signedAt}</span>
                {/if}
            </div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
            <button
                type="button"
                class="btn btn-ghost btn-sm md:btn-xs btn-square"
                onclick={() => openPayload(node.item.link.cid)}
                title="Open"
                aria-label="Open"
            >
                <Lucide icon={LExternalLink} size={16} />
            </button>
            {#if !readonly}
                <button
                    type="button"
                    class="btn btn-ghost btn-sm md:btn-xs btn-square"
                    onclick={() => {
                        const idx = perNamespace[ns].links.findIndex((x) => x === node.item);
                        if (idx >= 0) removeLink(ns, idx);
                    }}
                    title="Remove"
                    aria-label="Remove"
                >
                    <Lucide icon={LTrash2} size={16} />
                </button>
            {/if}
        </div>
    </div>
{/snippet}
