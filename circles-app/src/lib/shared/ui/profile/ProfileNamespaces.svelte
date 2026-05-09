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
    } from '$lib/shared/model/profile';
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
    import { ensureGnosisChain } from '$lib/shared/integrations/chain/gnosis';
    import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
    import { gnosisConfig } from '$lib/shared/config/circles';
    import { T } from '$lib/design-system/tokens.js';

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
            await ensureGnosisChain(ethereum);
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

<div style="display:flex;flex-direction:column;gap:8px;">
    {#each Object.keys(namespaces) as ns (ns)}
        {@const state = perNamespace[ns] ?? { loading: false, error: null, links: [], expanded: false }}
        <div style="border-radius:10px;border:1px solid {T.hairlineSoft};background:{T.pageDeep};overflow:hidden;">
            <button style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;text-align:left;border:0;background:transparent;cursor:pointer;" onclick={() => toggleNamespace(ns)}>
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="color:{T.inkMuted};">
                        {#if state.expanded}
                            <Lucide icon={LChevronDown} size={18} />
                        {:else}
                            <Lucide icon={LChevronRight} size={18} />
                        {/if}
                    </div>
                    <Avatar address={ns} view="horizontal" clickable={true} />
                </div>
                <div style="font-size:11px;font-weight:500;">
                    {#if state.loading}
                        <svg class="pn-spin" style="width:12px;height:12px;color:{T.primary};" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/>
                        </svg>
                    {:else if state.error}
                        <span style="color:{T.negative};">{state.error}</span>
                    {:else}
                        <span style="opacity:0.5;">{state.links.length} items</span>
                    {/if}
                </div>
            </button>

            {#if state.expanded}
                <div style="padding:8px;display:flex;flex-direction:column;gap:4px;background:rgba(255,255,255,0.4);border-top:1px solid {T.hairlineSoft};">
                    {#each state.links as item, i (i)}
                        <div style="border-radius:8px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;">
                                <div style="min-width:0;flex:1;">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                                        <span style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:{T.ink};">
                                            {item.link.name || 'Unnamed Link'}
                                        </span>
                                        <span style="font-size:10px;font-family:{T.fontMono};opacity:0.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                            {prettyIpfsCid(item.chunkCid)}
                                        </span>
                                    </div>
                                    <div style="font-size:11px;opacity:0.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:{T.inkBody};">
                                        {typeof item.link === 'object' ? JSON.stringify(item.link) : item.link}
                                    </div>
                                </div>

                                <div style="flex-shrink:0;display:flex;align-items:center;gap:4px;">
                                    <JumpLink
                                       style="width:24px;height:24px;border-radius:7px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
                                       url={ipfsGatewayUrl(item.chunkCid)}
                                       title="View on IPFS">
                                        <Lucide icon={LExternalLink} size={14} />
                                    </JumpLink>
                                    {#if !readonly}
                                        <button
                                            style="width:24px;height:24px;border-radius:7px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
                                            title="Edit"
                                            onclick={() => startEdit(ns, i)}>
                                            <Lucide icon={LPencil} size={14} />
                                        </button>
                                        <button
                                            style="width:24px;height:24px;border-radius:7px;border:0;background:transparent;color:{T.negative};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
                                            title="Remove"
                                            onclick={() => removeLink(ns, i)}>
                                            <Lucide icon={LTrash2} size={14} />
                                        </button>
                                    {/if}
                                </div>
                            </div>

                            {#if isEditing(ns, i) && editing}
                                <div style="padding:12px;display:flex;flex-direction:column;gap:8px;">
                                    <div style="border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};">
                                        <button
                                            type="button"
                                            style="width:100%;padding:10px 12px;text-align:left;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:space-between;border:0;background:transparent;cursor:pointer;color:{T.ink};"
                                            onclick={() => toggleMetadataEditor(ns, i)}
                                            disabled={editing.saving}
                                        >
                                            <span>Edit link metadata</span>
                                            <span style="opacity:0.7;">{editing.showMetadata ? 'Hide' : 'Show'}</span>
                                        </button>
                                        {#if editing.showMetadata}
                                            <div style="padding:12px;display:flex;flex-direction:column;gap:8px;">
                                                <label style="display:flex;flex-direction:column;gap:4px;">
                                                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">name</span>
                                                    <input
                                                        style="height:32px;padding:0 10px;border:1px solid {T.hairline};border-radius:8px;font-family:{T.fontSans};font-size:12px;color:{T.ink};background:{T.surface};outline:none;"
                                                        value={editing.metadata.name}
                                                        oninput={(e) => updateMetadataField(ns, i, 'name', (e.currentTarget as HTMLInputElement).value)}
                                                        disabled={editing.saving}
                                                    />
                                                </label>

                                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                                    <input
                                                        type="checkbox"
                                                        style="width:14px;height:14px;accent-color:{T.primary};"
                                                        checked={editing.metadata.encrypted}
                                                        onchange={(e) => updateMetadataEncrypted(ns, i, (e.currentTarget as HTMLInputElement).checked)}
                                                        disabled={editing.saving}
                                                    />
                                                    <span style="font-size:11px;color:{T.inkBody};">encrypted</span>
                                                </label>

                                                <label style="display:flex;flex-direction:column;gap:4px;">
                                                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">encryptionAlgorithm</span>
                                                    <input
                                                        style="height:32px;padding:0 10px;border:1px solid {T.hairline};border-radius:8px;font-family:{T.fontSans};font-size:12px;color:{T.ink};background:{T.surface};outline:none;"
                                                        value={editing.metadata.encryptionAlgorithm}
                                                        oninput={(e) => updateMetadataField(ns, i, 'encryptionAlgorithm', (e.currentTarget as HTMLInputElement).value)}
                                                        disabled={editing.saving || !editing.metadata.encrypted}
                                                    />
                                                </label>

                                                <label style="display:flex;flex-direction:column;gap:4px;">
                                                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">encryptionKeyFingerprint</span>
                                                    <input
                                                        style="height:32px;padding:0 10px;border:1px solid {T.hairline};border-radius:8px;font-family:{T.fontSans};font-size:12px;color:{T.ink};background:{T.surface};outline:none;"
                                                        value={editing.metadata.encryptionKeyFingerprint}
                                                        oninput={(e) => updateMetadataField(ns, i, 'encryptionKeyFingerprint', (e.currentTarget as HTMLInputElement).value)}
                                                        disabled={editing.saving || !editing.metadata.encrypted}
                                                    />
                                                </label>
                                            </div>
                                        {/if}
                                    </div>

                                    <div style="font-size:11px;opacity:0.6;font-family:{T.fontMono};word-break:break-all;">
                                        Source payload CID: {editing.sourceCid || '—'}
                                    </div>
                                    <textarea
                                        style="width:100%;padding:10px;border:1px solid {T.hairline};border-radius:8px;font-family:{T.fontMono};font-size:12px;color:{T.ink};background:{T.surface};outline:none;resize:vertical;"
                                        rows="10"
                                        value={editing.draft}
                                        oninput={(e) => onEditPayloadInput(ns, i, e)}
                                        disabled={editing.loadingPayload || editing.saving}
                                    ></textarea>
                                    {#if editing.loadingPayload}
                                        <div style="font-size:11px;opacity:0.7;display:flex;align-items:center;gap:6px;">
                                            <svg class="pn-spin" style="width:11px;height:11px;" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/>
                                            </svg>
                                            Loading payload from IPFS…
                                        </div>
                                    {/if}
                                    {#if editing.error}
                                        <div style="font-size:11px;color:{T.negative};">{editing.error}</div>
                                    {/if}
                                    <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
                                        <button
                                            type="button"
                                            style="height:28px;padding:0 12px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:12px;"
                                            onclick={() => cancelEdit(ns, i)}
                                            disabled={editing.saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            style="display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 12px;border-radius:9999px;border:0;background:{T.primary};color:#fff;cursor:pointer;font-family:{T.fontSans};font-size:12px;font-weight:580;"
                                            onclick={() => saveEditedLink(ns, i)}
                                            disabled={editing.saving || editing.loadingPayload}
                                        >
                                            {#if editing.saving}
                                                <svg class="pn-spin" style="width:11px;height:11px;" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/>
                                                </svg>
                                            {/if}
                                            Save replacement
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                    {#if state.links.length === 0 && !state.loading}
                        <div style="padding:16px 12px;text-align:center;font-size:11px;opacity:0.4;font-style:italic;">No links found in this namespace.</div>
                    {/if}
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
  @keyframes pn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .pn-spin { animation: pn-spin 0.9s linear infinite; }
</style>
