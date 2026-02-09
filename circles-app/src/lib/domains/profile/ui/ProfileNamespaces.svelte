<!-- lib/profile/ProfileNamespaces.svelte -->
<script lang="ts">
    import {createEventDispatcher} from 'svelte';
    import {runTask} from '$lib/shared/utils/tasks';
    import type {Address} from "@circles-sdk/utils";
    import type {CidV0} from '$lib/areas/market/offers';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { buildLinkDraft, canonicaliseLink } from '@circles-market/sdk';
    import {
        applyEditableLinkMetadata,
        loadNamespaceLinks,
        replaceLoadedNamespaceLinkAt,
        rewriteNamespaceFromLinks,
        type LoadedNamespaceLink
    } from '$lib/domains/profile/model';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import {
        ChevronRight as LChevronRight,
        ChevronDown as LChevronDown,
        Trash2 as LTrash2,
        ExternalLink as LExternalLink,
        Pencil as LPencil
    } from 'lucide';
    import { ipfsGatewayUrl } from '$lib/shared/utils/ipfs';
    import JumpLink from '$lib/shared/ui/content/jump/JumpLink.svelte';
    import { getProfilesBindings } from '$lib/areas/market/offers';
    import { getWalletProvider } from '$lib/shared/integrations/wallet';
    import { getMarketClient } from '$lib/shared/integrations/market';
    import { gnosisConfig } from '$lib/shared/config/circles';

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

    type EditState = {
        ns: string;
        idx: number;
        draft: string;
        error: string | null;
        saving: boolean;
        loadingPayload: boolean;
        sourceCid: string;
        showMetadata: boolean;
        metadata: {
            name: string;
            encrypted: boolean;
            encryptionAlgorithm: string;
            encryptionKeyFingerprint: string;
        };
    };

    let editing = $state<EditState | null>(null);

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
        if (editing && editing.ns === ns && editing.idx === idx) {
            editing = null;
        }
        await persistLinks(ns, next);
    }

    function isEditing(ns: string, idx: number): boolean {
        return !!editing && editing.ns === ns && editing.idx === idx;
    }

    function startEdit(ns: string, idx: number): void {
        if (readonly) return;
        const cur = ensureNamespaceState(ns);
        const item = cur.links[idx];
        if (!item) return;

        const cid = String(item?.link?.cid ?? '').trim();
        if (!cid) {
            editing = {
                ns,
                idx,
                draft: '',
                error: 'This link has no payload CID to edit.',
                saving: false,
                loadingPayload: false,
                sourceCid: '',
                showMetadata: false,
                metadata: {
                    name: String(item?.link?.name ?? ''),
                    encrypted: Boolean(item?.link?.encrypted),
                    encryptionAlgorithm: String(item?.link?.encryptionAlgorithm ?? ''),
                    encryptionKeyFingerprint: String(item?.link?.encryptionKeyFingerprint ?? '')
                }
            };
            return;
        }

        editing = {
            ns,
            idx,
            draft: '',
            error: null,
            saving: false,
            loadingPayload: true,
            sourceCid: cid,
            showMetadata: false,
            metadata: {
                name: String(item?.link?.name ?? ''),
                encrypted: Boolean(item?.link?.encrypted),
                encryptionAlgorithm: String(item?.link?.encryptionAlgorithm ?? ''),
                encryptionKeyFingerprint: String(item?.link?.encryptionKeyFingerprint ?? '')
            }
        };

        void (async () => {
            try {
                const payload = await getBindings().getJsonLd(cid);
                if (!isEditing(ns, idx) || !editing) return;
                editing = {
                    ...editing,
                    draft: JSON.stringify(payload, null, 2),
                    loadingPayload: false,
                    error: null
                };
            } catch (e: any) {
                if (!isEditing(ns, idx) || !editing) return;
                editing = {
                    ...editing,
                    loadingPayload: false,
                    error: `Failed to load payload ${cid}: ${String(e?.message ?? e)}`
                };
            }
        })();
    }

    function cancelEdit(ns: string, idx: number): void {
        if (!isEditing(ns, idx)) return;
        editing = null;
    }

    function updateEditDraft(ns: string, idx: number, value: string): void {
        if (!isEditing(ns, idx) || !editing) return;
        editing = { ...editing, draft: value, error: null };
    }

    function onEditPayloadInput(ns: string, idx: number, event: Event): void {
        const el = event.currentTarget as HTMLTextAreaElement | null;
        updateEditDraft(ns, idx, el?.value ?? '');
    }

    function toggleMetadataEditor(ns: string, idx: number): void {
        if (!isEditing(ns, idx) || !editing) return;
        editing = { ...editing, showMetadata: !editing.showMetadata };
    }

    function updateMetadataField(
        ns: string,
        idx: number,
        field: 'name' | 'encryptionAlgorithm' | 'encryptionKeyFingerprint',
        value: string
    ): void {
        if (!isEditing(ns, idx) || !editing) return;
        editing = {
            ...editing,
            error: null,
            metadata: {
                ...editing.metadata,
                [field]: value
            }
        };
    }

    function updateMetadataEncrypted(ns: string, idx: number, checked: boolean): void {
        if (!isEditing(ns, idx) || !editing) return;
        editing = {
            ...editing,
            error: null,
            metadata: {
                ...editing.metadata,
                encrypted: checked,
                encryptionAlgorithm: checked ? editing.metadata.encryptionAlgorithm : '',
                encryptionKeyFingerprint: checked ? editing.metadata.encryptionKeyFingerprint : ''
            }
        };
    }

    function parseEditedPayload(draft: string): { ok: true; payload: any } | { ok: false; error: string } {
        let parsed: any;
        try {
            parsed = JSON.parse(draft);
        } catch (e: any) {
            return { ok: false, error: `Invalid JSON: ${String(e?.message ?? e)}` };
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { ok: false, error: 'Edited payload must be a JSON object.' };
        }

        return { ok: true, payload: parsed };
    }

    async function saveEditedLink(ns: string, idx: number): Promise<void> {
        if (readonly) return;
        if (!isEditing(ns, idx) || !editing) return;
        if (editing.loadingPayload) return;

        const cur = ensureNamespaceState(ns);
        const currentItem = cur.links[idx];
        if (!currentItem) {
            editing = { ...editing, error: 'Link no longer exists. Please reload namespace and retry.' };
            return;
        }

        const payload = parseEditedPayload(editing.draft);
        if (!payload.ok) {
            editing = { ...editing, error: payload.error };
            return;
        }

        editing = { ...editing, saving: true, error: null };
        try {
            const newPayloadCid = await getBindings().putJsonLd(payload.payload);
            const originalName = String(currentItem?.link?.name ?? '').trim();
            if (!originalName) {
                throw new Error('Cannot replace link: original link has no name.');
            }

            const chainId = Number(currentItem?.link?.chainId ?? gnosisConfig.production.marketChainId ?? 100);
            if (!Number.isFinite(chainId) || chainId <= 0) {
                throw new Error('Cannot replace link: invalid chainId.');
            }

            const avatarLower = String(avatar).toLowerCase() as Address;
            const ethereum = getWalletProvider();
            const safeSigner = await getMarketClient().signers.createSafeSignerForAvatar({
                avatar: avatarLower,
                ethereum,
                chainId: BigInt(chainId),
                enforceChainId: true,
            });

            const replacementLink = await buildLinkDraft({
                name: originalName,
                cid: newPayloadCid,
                chainId,
                signerAddress: String(currentItem?.link?.signerAddress ?? avatarLower).toLowerCase(),
            });

            // Preserve non-CID metadata from the previous link where possible.
            replacementLink['@context'] = currentItem?.link?.['@context'] ?? replacementLink['@context'];
            replacementLink['@type'] = currentItem?.link?.['@type'] ?? replacementLink['@type'];
            replacementLink.encrypted = Boolean(currentItem?.link?.encrypted ?? replacementLink.encrypted);
            replacementLink.encryptionAlgorithm =
                currentItem?.link?.encryptionAlgorithm ?? replacementLink.encryptionAlgorithm;
            replacementLink.encryptionKeyFingerprint =
                currentItem?.link?.encryptionKeyFingerprint ?? replacementLink.encryptionKeyFingerprint;

            const metadataApplied = applyEditableLinkMetadata(replacementLink, {
                name: editing.metadata.name,
                encrypted: editing.metadata.encrypted,
                encryptionAlgorithm: editing.metadata.encryptionAlgorithm || null,
                encryptionKeyFingerprint: editing.metadata.encryptionKeyFingerprint || null
            });

            const preimage = canonicaliseLink(metadataApplied as any);
            const signature = await safeSigner.signBytes(preimage);
            metadataApplied.signature = signature;

            const next = replaceLoadedNamespaceLinkAt(cur.links, idx, metadataApplied);
            await persistLinks(ns, next);
            editing = null;
        } catch (e: any) {
            editing = {
                ...editing,
                saving: false,
                error: String(e?.message ?? e)
            };
        }
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
                        <div class="rounded-lg hover:bg-base-200/80 transition-all group">
                            <div class="flex items-center justify-between gap-3 px-3 py-2">
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
                                        <button class="btn btn-ghost btn-xs btn-square"
                                                title="Edit"
                                                onclick={() => startEdit(ns, i)}>
                                            <Lucide icon={LPencil} size={14} />
                                        </button>
                                        <button class="btn btn-ghost btn-xs btn-square text-error/70 hover:text-error"
                                                title="Remove"
                                                onclick={() => removeLink(ns, i)}>
                                            <Lucide icon={LTrash2} size={14} />
                                        </button>
                                    {/if}
                                </div>
                            </div>

                            {#if isEditing(ns, i) && editing}
                                <div class="px-3 pb-3 space-y-2">
                                    <div class="rounded-md border border-base-content/10 bg-base-100/50">
                                        <button
                                            type="button"
                                            class="w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between"
                                            onclick={() => toggleMetadataEditor(ns, i)}
                                            disabled={editing.saving}
                                        >
                                            <span>Edit link metadata</span>
                                            <span class="opacity-70">{editing.showMetadata ? 'Hide' : 'Show'}</span>
                                        </button>
                                        {#if editing.showMetadata}
                                            <div class="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <label class="form-control md:col-span-2">
                                                    <span class="label-text text-xs">name</span>
                                                    <input
                                                        class="input input-bordered input-sm"
                                                        value={editing.metadata.name}
                                                        oninput={(e) => updateMetadataField(ns, i, 'name', (e.currentTarget as HTMLInputElement).value)}
                                                        disabled={editing.saving}
                                                    />
                                                </label>

                                                <label class="label cursor-pointer justify-start gap-2 md:col-span-2">
                                                    <input
                                                        type="checkbox"
                                                        class="checkbox checkbox-xs"
                                                        checked={editing.metadata.encrypted}
                                                        onchange={(e) => updateMetadataEncrypted(ns, i, (e.currentTarget as HTMLInputElement).checked)}
                                                        disabled={editing.saving}
                                                    />
                                                    <span class="label-text text-xs">encrypted</span>
                                                </label>

                                                <label class="form-control">
                                                    <span class="label-text text-xs">encryptionAlgorithm</span>
                                                    <input
                                                        class="input input-bordered input-sm"
                                                        value={editing.metadata.encryptionAlgorithm}
                                                        oninput={(e) => updateMetadataField(ns, i, 'encryptionAlgorithm', (e.currentTarget as HTMLInputElement).value)}
                                                        disabled={editing.saving || !editing.metadata.encrypted}
                                                    />
                                                </label>

                                                <label class="form-control">
                                                    <span class="label-text text-xs">encryptionKeyFingerprint</span>
                                                    <input
                                                        class="input input-bordered input-sm"
                                                        value={editing.metadata.encryptionKeyFingerprint}
                                                        oninput={(e) => updateMetadataField(ns, i, 'encryptionKeyFingerprint', (e.currentTarget as HTMLInputElement).value)}
                                                        disabled={editing.saving || !editing.metadata.encrypted}
                                                    />
                                                </label>
                                            </div>
                                        {/if}
                                    </div>

                                    <div class="text-[11px] opacity-60 font-mono break-all">
                                        Source payload CID: {editing.sourceCid || '—'}
                                    </div>
                                    <textarea
                                        class="textarea textarea-bordered textarea-sm font-mono w-full"
                                        rows="10"
                                        value={editing.draft}
                                        oninput={(e) => onEditPayloadInput(ns, i, e)}
                                        disabled={editing.loadingPayload || editing.saving}
                                    ></textarea>
                                    {#if editing.loadingPayload}
                                        <div class="text-xs opacity-70 flex items-center gap-1.5">
                                            <span class="loading loading-spinner loading-xs"></span>
                                            Loading payload from IPFS…
                                        </div>
                                    {/if}
                                    {#if editing.error}
                                        <div class="text-xs text-error">{editing.error}</div>
                                    {/if}
                                    <div class="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            class="btn btn-ghost btn-xs"
                                            onclick={() => cancelEdit(ns, i)}
                                            disabled={editing.saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            class="btn btn-primary btn-xs"
                                            onclick={() => saveEditedLink(ns, i)}
                                            disabled={editing.saving || editing.loadingPayload}
                                        >
                                            {#if editing.saving}
                                                <span class="loading loading-spinner loading-xs"></span>
                                            {/if}
                                            Save replacement
                                        </button>
                                    </div>
                                </div>
                            {/if}
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
