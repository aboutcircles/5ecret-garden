<script lang="ts">
    import {circles} from '$lib/shared/state/circles';
    import type { Profile } from '$lib/shared/utils/profile';
    import CommonConnections from '$lib/shared/ui/profile/components/CommonConnections.svelte';
    import TrustRelationsList from '$lib/shared/ui/profile/components/TrustRelationsList.svelte';
    import HoldersList from '$lib/shared/ui/profile/components/HoldersList.svelte';
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import {contacts} from '$lib/shared/state/contacts';
    import {
        type AvatarRow,
        CirclesQuery,
        type TrustRelation,
        type TrustRelationRow,
    } from '@circles-sdk/data';
    import Untrust from '$lib/areas/contacts/ui/pages/Untrust.svelte';
    import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';
    import { openSendFlowPopup } from '$lib/areas/wallet/flows/send/openSendFlowPopup';
    import {getProfile} from '$lib/shared/utils/profile';
    import {formatTrustRelation, getTypeString} from '$lib/shared/utils/helpers';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import {popupControls} from '$lib/shared/state/popup';
    import JumpLink from '$lib/shared/ui/content/jump/JumpLink.svelte';
    import AddressComponent from '$lib/shared/ui/primitives/Address.svelte';
    import {uint256ToAddress, type Address} from '@circles-sdk/utils';
    import {transitiveTransfer} from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import {
        getAccountHoldings,
        getGroupCollateral, getGroupTokenHolders,
        getTreasuryAddress,
        getVaultAddress,
    } from '$lib/shared/utils/vault';
    import {goto} from '$app/navigation';
    import {avatarState} from '$lib/shared/state/avatar.svelte';

    /* NEW: tabs */
    import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
    import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
    import type { TabIdOf } from '$lib/shared/ui/primitives/tabs/tabId';
    // Offers tab dependencies
    import ProductCard from '$lib/areas/market/ui/product/ProductCard.svelte';
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import type { AggregatedCatalogItem } from '$lib/areas/market/model';
    import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
    // Namespaces explorer (read-only) for other profiles
    import { ProfileNamespaces } from '$lib/shared/ui/profile';
    import { loadProfileOrInit } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { createCirclesSdkProfilesBindings } from '@circles-profile/core';
    import { get } from 'svelte/store';
    import {gnosisConfig} from "$lib/shared/config/circles";
    import { TrustScoreBadge } from '$lib/shared/ui/profile';
    import TrustHistoryHeatmap from '$lib/areas/trust/ui/TrustHistoryHeatmap.svelte';
    import PersonalMintHistoryHeatmap from '$lib/areas/minting/ui/PersonalMintHistoryHeatmap.svelte';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { Star as LStar } from 'lucide';
    import { createAvatarDataSource } from '$lib/shared/data/circles/avatarDataSource';
    import {
        bookmarksStateStore,
        profileBookmarksService,
        profileBookmarksStore,
        type ProfileBookmark,
    } from '$lib/areas/settings/state/profileBookmarks';
    import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
    import { TRUST_ROUTING_HELP_LINES } from '$lib/shared/content/trustRoutingCopy';
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';
    import { shortenAddress } from '$lib/shared/utils/shared';

    let copiedAddr: boolean = $state(false);
    let copyAddrTimer: ReturnType<typeof setTimeout> | null = null;
    async function copyAddress(): Promise<void> {
        if (!address) return;
        await navigator.clipboard.writeText(String(address));
        copiedAddr = true;
        if (copyAddrTimer) clearTimeout(copyAddrTimer);
        copyAddrTimer = setTimeout(() => { copiedAddr = false; }, 1500);
    }

    interface Props {
        address: Address | undefined;
        trustVersion: number | undefined;
    }

    let {address, trustVersion}: Props = $props();

    $effect(() => {
        const hasAddress: boolean = !!address;
        if (hasAddress) {
            initialize(address as Address);
        }
    });

    let otherAvatar: AvatarRow | undefined = $state();
    let profile: Profile | undefined = $state();
    let mintHandler: Address | undefined = $state();

    let trustRow: TrustRelationRow | undefined = $state();
    const relationText = $derived.by(() => {
        if (!trustRow) return 'Not connected';
        const formatted = formatTrustRelation(trustRow.relation, profile);
        return formatted === 'None' ? 'Not connected' : formatted;
    });
    let collateralInTreasury: Array<{
        avatar: Address;
        amount: bigint;
        amountToRedeem: bigint;
        amountToRedeemInCircles: number;
        trustRelation?: TrustRelation;
    }> = $state([]);
    let collateralLoading: boolean = $state(false);
    let collateralError: string | null = $state(null);

    let tokenHolders: Array<{
        avatar: Address;
        amount: bigint;
        amountToRedeem: bigint;
        amountToRedeemInCircles: number;
        trustRelation?: TrustRelation;
    }> = $state([]);
    let holdersLoading: boolean = $state(false);
    let holdersError: string | null = $state(null);

    let holdings: Array<{
        avatar: Address;
        amount: bigint;
        amountToRedeem: bigint;
        amountToRedeemInCircles: number;
        trustRelation?: TrustRelation;
    }> = $state([]);
    let holdingsLoading: boolean = $state(false);
    let holdingsError: string | null = $state(null);

    // Offers tab state
    let offersLoading: boolean = $state(false);
    let offersError: string = $state('');
    let offers: AggregatedCatalogItem[] = $state([]);
    // Track which seller address the current `offers` belong to (lowercased)
    let offersFor: string | null = $state(null);

    async function loadOffers(): Promise<void> {
        if (!address) return;
        const seller = normalizeAddress(String(address));
        if (!seller) {
            offersError = 'Invalid address';
            offers = [];
            offersFor = null;
            return;
        }
        offersLoading = true;
        offersError = '';
        offers = [];
        try {
            const operator = gnosisConfig.production.marketOperator;
            if (!operator) {
                throw new Error('Market operator not configured');
            }
            const catalog = getMarketClient().catalog.forOperator(operator);
            const items = await catalog.fetchSellerCatalog(seller);
            // Defensive filter (API already filters by seller)
            offers = items.filter((p) => (p.seller ?? '').toLowerCase() === seller.toLowerCase());
            offersFor = seller;
        } catch (e: any) {
            offersError = e?.message || 'Failed to load offers';
            offersFor = seller; // avoid refetch loop on same address
        } finally {
            offersLoading = false;
        }
    }

    // Load when the Offers tab is selected or when the address changes while on the tab
    $effect(() => {
        if (selectedTab === 'offers' && address) {
            const want = normalizeAddress(String(address));
            if (!offersLoading && offersFor !== want) {
                void loadOffers();
            }
        }
    });

    // Also eagerly load offers whenever the viewed address changes,
    // so the Offers tab is ready immediately. This avoids timing issues
    // where the tab becomes visible before the fetch is triggered.
    $effect(() => {
        if (!address) return;
        const want = normalizeAddress(String(address));
        if (!offersLoading && offersFor !== want) {
            void loadOffers();
        }
    });

    // ─────────────────────────────────────────────────────────────
    // Namespaces explorer for the displayed profile (auto-load)
    // ─────────────────────────────────────────────────────────────
    let otherResolvedAvatar: Address | null = $state(null);
    let otherNamespaces: Record<string, string> = $state({});
    let otherLoading: boolean = $state(false);
    let otherError: string | null = $state(null);
    // Track which address' namespaces are currently loaded
    let namespacesFor: string | null = $state(null);

    function getBindings(): ProfilesBindings {
        const sdk = get(circles);
        if (!sdk) {
            throw new Error('Circles SDK not initialized');
        }
        const { bindings } = createCirclesSdkProfilesBindings({ circlesSdk: sdk as any });
        return bindings as ProfilesBindings;
    }

    async function loadNamespacesFor(addr: Address): Promise<void> {
        const norm = normalizeAddress(addr as any) as Address;
        namespacesFor = String(norm).toLowerCase();
        otherLoading = true;
        otherError = null;
        otherNamespaces = {};
        otherResolvedAvatar = norm as Address;
        try {
            const { profile } = await loadProfileOrInit(getBindings(), norm as Address);
            const nsObj = profile?.namespaces && typeof profile.namespaces === 'object' ? profile.namespaces : {};
            otherNamespaces = { ...(nsObj as Record<string, string>) };
        } catch (e: any) {
            otherError = String(e?.message ?? e);
        } finally {
            otherLoading = false;
        }
    }

    // Auto-load when the page knows the address and whenever it changes
    $effect(() => {
        if (!address) {
            otherResolvedAvatar = null;
            otherNamespaces = {};
            namespacesFor = null;
            return;
        }
        const want = normalizeAddress(String(address)).toLowerCase();
        if (!otherLoading && namespacesFor !== want) {
            void loadNamespacesFor(address);
        }
    });

    async function initialize(address: Address) {
        const sdk = $circles;
        if (!sdk) {
            return;
        }
        const avatarDataSource = createAvatarDataSource(sdk);

        const [other, prof] = await Promise.all([
            avatarDataSource.getAvatarInfo(address),
            getProfile(address),
        ]);
        otherAvatar = other;
        profile = prof;

        trustRow = $contacts?.data[address]?.row;

        const isGroup: boolean = otherAvatar?.type === 'CrcV2_RegisterGroup';
        const isHuman: boolean = otherAvatar?.type === 'CrcV2_RegisterHuman';

        const toTokenRows = (
            result: { columns: string[]; rows: any[][] } | null,
            avatarColumn: 'tokenId' | 'account'
        ) => {
            if (!result) return [];
            const { columns, rows } = result;
            const avatarIdx = columns.indexOf(avatarColumn);
            const colBal = columns.indexOf('demurragedTotalBalance');
            return rows
                .map((row) => ({
                    avatar: uint256ToAddress(BigInt(row[avatarIdx])),
                    amount: BigInt(row[colBal]),
                    amountToRedeemInCircles: 0,
                    amountToRedeem: 0n,
                }))
                .sort((a, b) => (a.amount > b.amount ? -1 : a.amount === b.amount ? 0 : 1));
        };

        const loadMintHandler = async () => {
            try {
                const findMintHandlerQuery = new CirclesQuery<any>(sdk.circlesRpc, {
                    namespace: 'V_CrcV2',
                    table: 'Groups',
                    columns: ['mintHandler'],
                    filter: [
                        {
                            Type: 'FilterPredicate',
                            FilterType: 'Equals',
                            Column: 'group',
                            Value: address,
                        },
                    ],
                    sortOrder: 'DESC',
                    limit: 1,
                });
                mintHandler = (await findMintHandlerQuery.getSingleRow())?.mintHandler as Address | undefined;
            } catch (e) {
                mintHandler = undefined;
            }
        };

        const loadCollateral = async () => {
            collateralLoading = true;
            collateralError = null;
            try {
                const [vaultRes, treasuryRes] = await Promise.allSettled([
                    getVaultAddress(sdk.circlesRpc, otherAvatar!.avatar),
                    getTreasuryAddress(sdk.circlesRpc, otherAvatar!.avatar),
                ]);
                const vaultAddress = vaultRes.status === 'fulfilled' ? vaultRes.value : null;
                const treasuryAddress = treasuryRes.status === 'fulfilled' ? treasuryRes.value : null;
                const balanceOwner: string = vaultAddress ?? treasuryAddress ?? '';

                if (!balanceOwner) {
                    collateralInTreasury = [];
                    return;
                }
                const balancesResult = await getGroupCollateral(sdk.circlesRpc, balanceOwner);
                collateralInTreasury = toTokenRows(balancesResult, 'tokenId');
            } catch (e: any) {
                collateralError = e?.message ?? 'Failed to load collateral';
                collateralInTreasury = [];
            } finally {
                collateralLoading = false;
            }
        };

        const loadHoldings = async () => {
            holdingsLoading = true;
            holdingsError = null;
            try {
                const holdingsResult = await getAccountHoldings(sdk.circlesRpc, address);
                holdings = toTokenRows(holdingsResult, 'tokenId');
            } catch (e: any) {
                holdingsError = e?.message ?? 'Failed to load holdings';
                holdings = [];
            } finally {
                holdingsLoading = false;
            }
        };

        const loadTokenHolders = async () => {
            holdersLoading = true;
            holdersError = null;
            try {
                const tokenHoldersResult = await getGroupTokenHolders(sdk.circlesRpc, address);
                tokenHolders = toTokenRows(tokenHoldersResult, 'account');
            } catch (e: any) {
                holdersError = e?.message ?? 'Failed to load holders';
                tokenHolders = [];
            } finally {
                holdersLoading = false;
            }
        };

        if (isGroup) {
            await Promise.allSettled([
                loadMintHandler(),
                loadCollateral(),
                loadTokenHolders(),
            ]);
        } else {
            await Promise.allSettled([
                loadHoldings(),
                ...(isHuman ? [loadTokenHolders()] : []),
            ]);
        }
    }

    const TAB_IDS = [
        'common_connections',
        'trusts',
        'trusted_by',
        'trust_history',
        'minting_history',
        'collateral',
        'holders',
        'holdings',
        'offers',
        'explore_namespaces',
    ] as const;
    type TabId = TabIdOf<typeof TAB_IDS>;

    const tabPanelClass = 'pt-4 pb-2 bg-transparent border-none';

    let selectedTab = $state<TabId>('common_connections');

    function trustPillConfig(relation: string | undefined) {
        switch (relation) {
            case 'mutuallyTrusts': return { label: 'Both accept', bg: '#DCEBDF', color: '#2D8A52' };
            case 'trusts':         return { label: 'You accept',  bg: '#FBEFCB', color: '#B07014' };
            case 'trustedBy':      return { label: 'Accepts you', bg: '#EEEBFA', color: '#5849D4' };
            default: return null;
        }
    }
    let commonConnectionsCount = $state(0);
    let trustsCount = $state(0);
    let trustedByCount = $state(0);
    let trustHistoryEventCount = $state(0);
    let mintingHistoryEventCount = $state(0);
    let bookmarkedProfiles: ProfileBookmark[] = $state([]);
    let showBookmarkEditor: boolean = $state(false);
    let bookmarkNoteInput: string = $state('');
    let bookmarkFolders: string[] = $state([]);
    let bookmarkFolderSelection: string = $state('');
    let newBookmarkFolderInput: string = $state('');
    let bookmarkButtonEl: HTMLButtonElement | null = $state(null);
    let bookmarkPopoverEl: HTMLDivElement | null = $state(null);

    const normalizedAddress = $derived.by(() => {
        if (!address) return null;
        const v = String(address).trim().toLowerCase();
        return /^0x[a-f0-9]{40}$/.test(v) ? v : null;
    });

    const currentBookmark = $derived(
        normalizedAddress
            ? bookmarkedProfiles.find((v) => v.address === normalizedAddress)
            : undefined
    );
    const isBookmarked = $derived(!!currentBookmark);

    $effect(() => {
        const unsubscribe = profileBookmarksStore.subscribe((value) => {
            bookmarkedProfiles = value;
        });
        return () => unsubscribe();
    });

    $effect(() => {
        const unsubscribe = bookmarksStateStore.subscribe((value) => {
            bookmarkFolders = value.folders;
        });
        return () => unsubscribe();
    });

    function resolveBookmarkFolderInput(): string | undefined {
        const fromNewInput = profileBookmarksService.ensureProfileFolder(newBookmarkFolderInput);
        if (fromNewInput) {
            bookmarkFolderSelection = fromNewInput;
            newBookmarkFolderInput = '';
            return fromNewInput;
        }

        const selected = bookmarkFolderSelection.trim();
        return selected.length > 0 ? selected : undefined;
    }

    function openBookmarkEditor(): void {
        if (!address) return;
        const currentFolder = currentBookmark?.folder ?? '';
        bookmarkNoteInput = currentBookmark?.note ?? '';
        bookmarkFolderSelection = currentFolder;
        newBookmarkFolderInput = '';
        showBookmarkEditor = !showBookmarkEditor;
    }

    function saveBookmarkWithCurrentNote(): void {
        if (!address) return;
        profileBookmarksService.upsertProfile(String(address), {
            note: bookmarkNoteInput,
            folder: resolveBookmarkFolderInput(),
        });
        showBookmarkEditor = false;
    }

    function removeBookmark(): void {
        if (!address) return;
        profileBookmarksService.removeProfile(String(address));
        showBookmarkEditor = false;
    }

    $effect(() => {
        if (!showBookmarkEditor) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            const insideButton = !!(bookmarkButtonEl && target && bookmarkButtonEl.contains(target));
            const insidePopover = !!(bookmarkPopoverEl && target && bookmarkPopoverEl.contains(target));
            if (!insideButton && !insidePopover) {
                showBookmarkEditor = false;
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                showBookmarkEditor = false;
            }
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    });

    const availableTabIds = $derived((() => {
        const ids: TabId[] = ['common_connections', 'trusts', 'trusted_by', 'trust_history', 'minting_history'];
        if (otherAvatar?.type === 'CrcV2_RegisterGroup') ids.push('collateral');
        if (otherAvatar?.type === 'CrcV2_RegisterGroup' || otherAvatar?.type === 'CrcV2_RegisterHuman') {
            ids.push('holders');
        }
        if (
            otherAvatar?.type === 'CrcV2_RegisterHuman' ||
            otherAvatar?.type === 'CrcV2_RegisterOrganization'
        ) {
            ids.push('holdings');
        }
        ids.push('offers');
        ids.push('explore_namespaces');
        return ids;
    })());

    const tabOrder = $derived.by(() => {
        const ids = [...availableTabIds];
        const namespacesIndex = ids.indexOf('explore_namespaces');
        if (namespacesIndex > -1) {
            ids.splice(namespacesIndex, 1);
            ids.push('explore_namespaces');
        }
        return ids;
    });

    $effect(() => {
        // When conditional tabs appear/disappear, ensure `selectedTab` always points to a visible tab.
        if (!availableTabIds.includes(selectedTab)) {
            selectedTab = availableTabIds[0] ?? 'common_connections';
        }
    });

    const connectionsCount = $derived(trustsCount > 0 ? trustsCount : undefined);
    const groupsCount = $derived<number | undefined>(undefined);

</script>

<div style="width:100%;">
    <!-- Hero card: gradient banner + avatar overlap -->
    <div style="border-radius:20px;overflow:hidden;background:{T.surface};border:1px solid {T.hairlineSoft};box-shadow:{T.shadow.xs};margin-bottom:14px;">
        <!-- Gradient banner -->
        <div style="height:110px;background:linear-gradient(115deg,{T.coralSoft} 0%,{T.lilacSoft} 55%,{T.butterSoft} 100%);"></div>

        <!-- Profile content -->
        <div style="padding:0 18px 18px;display:flex;flex-direction:column;gap:10px;">
            <!-- Avatar (overlaps banner) + trust pill on right -->
            <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:-40px;">
                <div style="width:80px;height:80px;border-radius:50%;border:4px solid {T.surface};background:{T.surface};overflow:hidden;flex-shrink:0;box-shadow:{T.shadow.xs};">
                    {#if profile?.previewImageUrl}
                        <img src={profile.previewImageUrl} alt={profile?.name ?? 'avatar'} style="width:100%;height:100%;object-fit:cover;display:block;" />
                    {:else}
                        <div style="width:100%;height:100%;background:{T.primary};display:flex;align-items:center;justify-content:center;color:#fff;font-family:{T.fontDisplay};font-size:30px;letter-spacing:-0.02em;">
                            {(profile?.name ?? (address ?? '?')).toString().charAt(0).toUpperCase()}
                        </div>
                    {/if}
                </div>

                {#if trustRow}
                    {@const pill = trustPillConfig(trustRow.relation)}
                    {#if pill}
                        <span style="display:inline-flex;align-items:center;padding:5px 12px;border-radius:9999px;background:{pill.bg};color:{pill.color};font-family:{T.fontSans};font-size:11.5px;font-weight:580;margin-bottom:6px;">
                            {pill.label}
                        </span>
                    {/if}
                {/if}
            </div>

            <!-- Name + help -->
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-family:{T.fontDisplay};font-size:30px;color:{T.ink};letter-spacing:-0.02em;line-height:1.1;">
                    {profile?.name ?? (address ? shortenAddress(address) : 'Loading…')}
                </span>
                <HelpPopover
                    title="Trust & routing"
                    lines={TRUST_ROUTING_HELP_LINES}
                    buttonClass="btn btn-ghost btn-xs btn-square opacity-50"
                    widthClass="w-80"
                />
            </div>

            <!-- Address / metadata row -->
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                {#if otherAvatar?.type}
                    <span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;background:{T.pageDeep};color:{T.inkBody};font-family:{T.fontSans};font-size:10.5px;font-weight:580;letter-spacing:0.02em;">
                        {getTypeString(otherAvatar.type)}
                    </span>
                {/if}

                {#if address}
                    <button
                        type="button"
                        onclick={copyAddress}
                        aria-label={copiedAddr ? 'Address copied' : 'Copy address'}
                        title={copiedAddr ? 'Copied!' : 'Copy address'}
                        style="display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:9999px;background:{copiedAddr ? T.sageSoft : T.pageDeep};color:{copiedAddr ? T.positive : T.inkBody};border:0;cursor:pointer;font-family:{T.fontMono};font-size:11px;letter-spacing:0.02em;transition:background .15s ease-out,color .15s ease-out;"
                    >
                        {shortenAddress(address)}
                        <Icon name={copiedAddr ? 'check' : 'copy'} size={11} stroke={copiedAddr ? T.positive : T.inkMuted} strokeWidth={2} />
                    </button>

                    <div style="position:relative;display:inline-flex;">
                        <button
                            type="button"
                            onclick={openBookmarkEditor}
                            bind:this={bookmarkButtonEl}
                            aria-label={isBookmarked ? 'Edit profile bookmark' : 'Bookmark profile'}
                            title={isBookmarked ? 'Edit bookmark' : 'Bookmark profile'}
                            style="width:24px;height:24px;border-radius:9999px;background:{T.pageDeep};border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
                        >
                            <Lucide icon={LStar} size={12} class={isBookmarked ? 'text-yellow-500 fill-yellow-500' : 'text-base-content/50'} />
                        </button>

                        {#if showBookmarkEditor}
                            <div
                                bind:this={bookmarkPopoverEl}
                                style="
                                    position:absolute;z-index:20;top:calc(100% + 8px);right:0;width:280px;
                                    background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
                                    box-shadow:{T.shadow.md};padding:14px;display:flex;flex-direction:column;gap:10px;
                                "
                            >
                                <div style="font-size:13px;font-weight:580;color:{T.ink};letter-spacing:-0.005em;">Profile bookmark</div>

                                <div style="display:flex;flex-direction:column;gap:6px;">
                                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Folder</span>
                                    {#if bookmarkFolders.length > 0}
                                        <select
                                            style="width:100%;padding:8px 12px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};box-sizing:border-box;cursor:pointer;"
                                            bind:value={bookmarkFolderSelection}
                                        >
                                            <option value="">No folder</option>
                                            {#each bookmarkFolders as folder (folder)}
                                                <option value={folder}>{folder}</option>
                                            {/each}
                                        </select>
                                    {:else}
                                        <div style="font-size:11.5px;color:{T.inkMuted};">No folders yet — create one below.</div>
                                    {/if}
                                    <input
                                        type="text"
                                        maxlength="64"
                                        placeholder="Create folder (e.g. Friends)"
                                        bind:value={newBookmarkFolderInput}
                                        style="width:100%;padding:8px 12px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
                                    />
                                </div>

                                <textarea
                                    rows={3}
                                    placeholder="Add a note (optional)"
                                    bind:value={bookmarkNoteInput}
                                    style="width:100%;padding:9px 12px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};box-sizing:border-box;resize:vertical;min-height:64px;"
                                ></textarea>

                                <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap;">
                                    <button
                                        type="button"
                                        style="height:30px;padding:0 12px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:12px;cursor:pointer;"
                                        onclick={() => (showBookmarkEditor = false)}
                                    >Cancel</button>
                                    {#if isBookmarked}
                                        <button
                                            type="button"
                                            style="height:30px;padding:0 12px;border-radius:9999px;border:0;background:transparent;color:{T.negative};font-size:12px;font-weight:540;cursor:pointer;"
                                            onclick={removeBookmark}
                                        >Remove</button>
                                    {/if}
                                    <button
                                        type="button"
                                        style="height:30px;padding:0 14px;border-radius:9999px;border:0;cursor:pointer;background:{T.primary};color:#fff;font-size:12px;font-weight:580;box-shadow:0 2px 6px rgba(88,73,212,0.2);"
                                        onclick={saveBookmarkWithCurrentNote}
                                    >Save</button>
                                </div>
                            </div>
                        {/if}
                    </div>

                    {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
                        <button
                            type="button"
                            aria-label="View metrics"
                            title="View metrics"
                            onclick={() => { popupControls.closeAndThen(() => { void goto('/groups/metrics/' + address); }); }}
                            style="width:24px;height:24px;border-radius:9999px;background:{T.pageDeep};border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
                        >
                            <img src="/chart.svg" alt="" style="width:12px;" aria-hidden="true" />
                        </button>
                    {/if}

                    <JumpLink
                        url={'https://gnosisscan.io/address/' + address}
                        ariaLabel="View on GnosisScan"
                        className="inline-flex items-center justify-center"
                    >
                        <span style="width:24px;height:24px;border-radius:9999px;background:{T.pageDeep};display:inline-flex;align-items:center;justify-content:center;">
                            <Icon name="external" size={11} stroke={T.inkBody} />
                        </span>
                    </JumpLink>
                {/if}
            </div>

            <!-- Bio / description -->
            {#if profile?.description}
                <p style="margin:6px 0 0;font-size:13px;color:{T.inkBody};line-height:1.5;">{profile.description}</p>
            {/if}

            <!-- Trust score badge -->
            <div style="margin-top:6px;">
                <TrustScoreBadge {address} />
            </div>

            <!-- Action buttons -->
            <div style="display:flex;gap:8px;margin-top:8px;">
                {#if !avatarState.isGroup}
                    <button
                        type="button"
                        onclick={() => { openSendFlowPopup({ selectedAddress: otherAvatar?.avatar, selectedAsset: transitiveTransfer(), amount: undefined, transitiveOnly: true }); }}
                        style="
                            flex:1;height:42px;border-radius:9999px;cursor:pointer;
                            background:{T.primary};color:#fff;border:0;
                            display:inline-flex;align-items:center;justify-content:center;gap:7px;
                            font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                            box-shadow:0 4px 12px rgba(88,73,212,0.25),0 1px 0 rgba(255,255,255,0.18) inset;
                        "
                    >
                        <Icon name="send" size={15} stroke="#fff" strokeWidth={2} />
                        Send
                    </button>
                {/if}

                {#if otherAvatar?.type === 'CrcV2_RegisterGroup' && !!mintHandler && !avatarState.isGroup}
                    <button
                        type="button"
                        onclick={() => { openSendFlowPopup({ selectedAddress: mintHandler, selectedAsset: transitiveTransfer(), amount: undefined, transitiveOnly: true }); }}
                        style="
                            flex:1;height:42px;border-radius:9999px;cursor:pointer;
                            background:{T.primary};color:#fff;border:0;
                            display:inline-flex;align-items:center;justify-content:center;gap:7px;
                            font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                        "
                    >
                        <Icon name="sparkle" size={15} stroke="#fff" strokeWidth={2} />
                        Mint
                    </button>
                {/if}

                {#if trustRow?.relation === 'trusts' || trustRow?.relation === 'mutuallyTrusts'}
                    <button
                        type="button"
                        onclick={() => { popupControls.open({ title: !avatarState.isGroup ? 'Untrust' : 'Remove member', kind: 'confirm', dismiss: 'explicit', component: Untrust, props: { address, trustVersion } }); }}
                        style="
                            flex:1;height:42px;border-radius:9999px;cursor:pointer;
                            background:{T.surface};color:{T.ink};border:1px solid {T.hairline};
                            display:inline-flex;align-items:center;justify-content:center;gap:7px;
                            font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                            box-shadow:{T.shadow.xs};
                        "
                    >
                        {!avatarState.isGroup ? 'Untrust' : 'Remove member'}
                    </button>
                {:else}
                    <button
                        type="button"
                        onclick={() => { if (!address || !avatarState.avatar) return; openAddTrustFlow({ context: { actorType: avatarState.isGroup ? 'group' : 'avatar', actorAddress: avatarState.avatar.address, selectedTrustees: [address] } }); }}
                        style="
                            flex:1;height:42px;border-radius:9999px;cursor:pointer;
                            background:{T.primary};color:#fff;border:0;
                            display:inline-flex;align-items:center;justify-content:center;gap:7px;
                            font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                            box-shadow:0 4px 12px rgba(88,73,212,0.25),0 1px 0 rgba(255,255,255,0.18) inset;
                        "
                    >
                        <Icon name="trust" size={15} stroke="#fff" strokeWidth={2} />
                        {trustRow?.relation === 'trustedBy'
                            ? (!avatarState.isGroup ? 'Trust back' : 'Add as member')
                            : (!avatarState.isGroup ? 'Trust' : 'Add as member')}
                    </button>
                {/if}
            </div>

            <!-- Stat bar -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid {T.hairlineSoft};margin:0 -18px -18px;">
                <!-- stat 1 -->
                <div style="display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-right:1px solid {T.hairlineSoft};">
                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Connections</span>
                    <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;line-height:1;">{connectionsCount ?? '—'}</span>
                </div>
                <!-- stat 2 -->
                <div style="display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-right:1px solid {T.hairlineSoft};">
                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Trusted by</span>
                    <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;line-height:1;">{trustedByCount ?? '—'}</span>
                </div>
                <!-- stat 3 -->
                <div style="display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-right:1px solid {T.hairlineSoft};">
                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Groups</span>
                    <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;line-height:1;">{groupsCount ?? '—'}</span>
                </div>
                <!-- stat 4 -->
                <div style="display:flex;flex-direction:column;gap:2px;padding:14px 16px;">
                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Circle depth</span>
                    <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;line-height:1;">—</span>
                </div>
            </div>
        </div>
    </div>
</div>

<Tabs
        id="profile-tabs"
        bind:selected={selectedTab}
        variant="boxed"
        size="sm"
        style="width:100%;padding:0;margin-top:24px;"
        fitted={false}
        tabOrder={tabOrder}
>
    <Tab
            id="common_connections"
            title="Common connections"
            badge={commonConnectionsCount}
            panelClass={tabPanelClass}
    >
        <div style="width:100%;">
            <CommonConnections
                    otherAvatarAddress={otherAvatar?.avatar}
                    bind:commonConnectionsCount
            />
        </div>
    </Tab>

    <Tab
            id="trusts"
            title="Trusts"
            badge={trustsCount}
            panelClass={tabPanelClass}
    >
        <div style="width:100%;">
            <TrustRelationsList
                    avatarAddress={otherAvatar?.avatar}
                    relation="trusts"
                    bind:count={trustsCount}
            />
        </div>
    </Tab>

    <Tab
            id="trusted_by"
            title="Trusted by"
            badge={trustedByCount}
            panelClass={tabPanelClass}
    >
        <div style="width:100%;">
            <TrustRelationsList
                    avatarAddress={otherAvatar?.avatar}
                    relation="trustedBy"
                    bind:count={trustedByCount}
            />
        </div>
    </Tab>

    <Tab
            id="trust_history"
            title="Trust history"
            badge={trustHistoryEventCount}
            panelClass={tabPanelClass}
    >
        <div style="width:100%;">
            <TrustHistoryHeatmap
                    address={address}
                    granularity="month"
                    showGranularitySwitch={true}
                    bind:eventCount={trustHistoryEventCount}
            />
        </div>
    </Tab>

    <Tab
            id="minting_history"
            title="Minting hstory"
            badge={mintingHistoryEventCount}
            panelClass={tabPanelClass}
    >
        <div style="width:100%;">
            <PersonalMintHistoryHeatmap
                    address={address}
                    bind:eventCount={mintingHistoryEventCount}
            />
        </div>
    </Tab>

    {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
        <Tab
                id="collateral"
                title="Collateral"
                badge={collateralInTreasury.length}
                panelClass={tabPanelClass}
        >
            <div style="width:100%;">
                {#if collateralLoading}
                    <div style="display:flex;flex-direction:column;">
                        {#each Array(4) as _, i (i)}
                            <AvatarRowPlaceholder />
                        {/each}
                    </div>
                {:else if collateralError}
                    <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:8px 12px;font-size:12px;color:{T.inkBody};">{collateralError}</div>
                {:else}
                    <HoldersList
                            holders={collateralInTreasury}
                            emptyLabel="No collateral"
                            noMatchesLabel="No matching collateral"
                            searchPlaceholder="Search collateral by address or name"
                    />
                {/if}
            </div>
        </Tab>
    {/if}

    {#if otherAvatar?.type === 'CrcV2_RegisterGroup' || otherAvatar?.type === 'CrcV2_RegisterHuman'}
        <Tab
                id="holders"
                title="Holders"
                badge={tokenHolders.length}
                panelClass={tabPanelClass}
        >
            <div style="width:100%;">
                {#if holdersLoading}
                    <div style="display:flex;flex-direction:column;">
                        {#each Array(4) as _, i (i)}
                            <AvatarRowPlaceholder />
                        {/each}
                    </div>
                {:else if holdersError}
                    <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:8px 12px;font-size:12px;color:{T.inkBody};">{holdersError}</div>
                {:else}
                    <HoldersList holders={tokenHolders} />
                {/if}
            </div>
        </Tab>
    {/if}

    {#if otherAvatar?.type === 'CrcV2_RegisterHuman' || otherAvatar?.type === 'CrcV2_RegisterOrganization'}
        <Tab
                id="holdings"
                title="Holdings"
                badge={holdings.length}
                panelClass={tabPanelClass}
        >
            <div style="width:100%;">
                {#if holdingsLoading}
                    <div style="display:flex;flex-direction:column;">
                        {#each Array(4) as _, i (i)}
                            <AvatarRowPlaceholder />
                        {/each}
                    </div>
                {:else if holdingsError}
                    <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:8px 12px;font-size:12px;color:{T.inkBody};">{holdingsError}</div>
                {:else}
                    <HoldersList holders={holdings} />
                {/if}
            </div>
        </Tab>
    {/if}

    <!-- Offers tab: shows products listed by this profile's address -->
    <Tab
            id="offers"
            title="Offers"
            badge={offers.length}
            panelClass={tabPanelClass}
    >
        {#if offersLoading}
            <div style="display:flex;align-items:center;gap:8px;padding:8px 0;color:{T.inkMuted};font-size:12.5px;">
                <svg class="pf-spin" style="width:18px;height:18px;color:{T.primary};" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>
                <span>Loading offers…</span>
            </div>
        {:else if offersError}
            <div style="background:{T.warningSoft};border:1px solid rgba(176,112,20,0.2);border-radius:10px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <span style="font-size:12px;color:{T.inkBody};">{offersError}</span>
                <button
                    type="button"
                    style="height:24px;padding:0 10px;border-radius:9999px;border:1px solid {T.warning};background:{T.surface};color:{T.warning};font-size:11px;font-weight:540;cursor:pointer;"
                    onclick={loadOffers}
                >Retry</button>
            </div>
        {:else}
            {#if offers.length === 0}
                <div style="font-size:12.5px;color:{T.inkMuted};padding:8px 0;">No offers</div>
            {:else}
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;" data-sveltekit-preload-data="hover">
                    {#each offers as p (p.productCid ?? p.linkKeccak ?? p.indexInChunk)}
                        <ProductCard
                                product={p}
                                showSellerInfo={false}
                                ondeleted={() => loadOffers()}
                        />
                    {/each}
                </div>
            {/if}
        {/if}
    </Tab>

    <!-- Explore namespaces tab: auto-load the viewed profile's namespaces (read-only) -->
    <Tab
            id="explore_namespaces"
            title="Namespaces"
            panelClass={tabPanelClass}
    >
        <div style="display:flex;flex-direction:column;gap:10px;">
            {#if otherError}
                <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:8px 12px;font-size:12px;color:{T.inkBody};">{otherError}</div>
            {/if}

            {#if otherLoading}
                <div style="display:flex;align-items:center;gap:8px;padding:8px 0;color:{T.inkMuted};font-size:12.5px;">
                    <svg class="pf-spin" style="width:18px;height:18px;color:{T.primary};" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>
                    <span>Loading namespaces…</span>
                </div>
            {:else if otherResolvedAvatar}
                <ProfileNamespaces avatar={otherResolvedAvatar} namespaces={otherNamespaces} readonly={true} />
            {:else}
                <div style="font-size:12.5px;color:{T.inkMuted};">No avatar selected.</div>
            {/if}
        </div>
    </Tab>

</Tabs>

<style>
  @keyframes pf-spin { from {} to { transform: rotate(360deg); } }
  .pf-spin { animation: pf-spin 0.8s linear infinite; }
</style>