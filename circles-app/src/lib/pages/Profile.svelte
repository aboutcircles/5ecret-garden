<script lang="ts">
    import {circles} from '$lib/stores/circles';
    import type { Profile } from '$lib/utils/profile';
    import CommonConnections from '$lib/components/CommonConnections.svelte';
    import TrustRelationsList from '$lib/components/TrustRelationsList.svelte';
    import HoldersList from '$lib/components/HoldersList.svelte';
    import {contacts} from '$lib/stores/contacts';
    import {
        type AvatarRow,
        CirclesQuery,
        type TrustRelation,
        type TrustRelationRow,
    } from '@circles-sdk/data';
    import Untrust from '$lib/pages/Untrust.svelte';
    import Trust from '$lib/pages/Trust.svelte';
    import SelectAsset from '$lib/flows/send/2_Asset.svelte';
    import {getProfile} from '$lib/utils/profile';
    import {formatTrustRelation, getTypeString} from '$lib/utils/helpers';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import {popupControls} from '$lib/stores/popup';
    import JumpLink from '$lib/components/jump/JumpLink.svelte';
    import AddressComponent from '$lib/components/Address.svelte';
    import {uint256ToAddress, type Address} from '@circles-sdk/utils';
    import SelectAmount from '$lib/flows/send/3_Amount.svelte';
    import {transitiveTransfer} from '$lib/pages/SelectAsset.svelte';
    import {
        getAccountHoldings,
        getGroupCollateral, getGroupTokenHolders,
        getTreasuryAddress,
        getVaultAddress,
    } from '$lib/utils/vault';
    import CollateralTable from '$lib/components/CollateralTable.svelte';
    import {goto} from '$app/navigation';
    import {avatarState} from '$lib/stores/avatar.svelte';

    /* NEW: tabs */
    import Tabs from '$lib/components/tabs/Tabs.svelte';
    import Tab from '$lib/components/tabs/Tab.svelte';
    import type { TabIdOf } from '$lib/components/tabs/tabId';
    // Offers tab dependencies
    import ProductCard from '$lib/components/ProductCard.svelte';
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import type { AggregatedCatalogItem } from '$lib/market/types';
    import { getMarketClient } from '$lib/sdk/marketClient';
    // Namespaces explorer (read-only) for other profiles
    import ProfileNamespaces from '$lib/profile/ProfileNamespaces.svelte';
    import { loadProfileOrInit } from '@circles-market/sdk';
    import type { ProfilesBindings } from '@circles-market/sdk';
    import { createCirclesSdkProfilesBindings } from '@circles-profile/core';
    import { get } from 'svelte/store';
    import {gnosisConfig} from "$lib/circlesConfig";

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
        offersLoading = true;
        offersError = '';
        offers = [];
        try {
            const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
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
        const hasCircles: boolean = !!$circles;
        if (!hasCircles) {
            return;
        }

        const [other, prof] = await Promise.all([
            $circles.data.getAvatarInfo(address),
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
                const findMintHandlerQuery = new CirclesQuery<any>($circles.circlesRpc, {
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
                    getVaultAddress($circles.circlesRpc, otherAvatar!.avatar),
                    getTreasuryAddress($circles.circlesRpc, otherAvatar!.avatar),
                ]);
                const vaultAddress = vaultRes.status === 'fulfilled' ? vaultRes.value : null;
                const treasuryAddress = treasuryRes.status === 'fulfilled' ? treasuryRes.value : null;
                const balanceOwner: string = vaultAddress ?? treasuryAddress ?? '';

                if (!balanceOwner) {
                    collateralInTreasury = [];
                    return;
                }
                const balancesResult = await getGroupCollateral($circles.circlesRpc, balanceOwner);
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
                const holdingsResult = await getAccountHoldings($circles.circlesRpc, address);
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
                const tokenHoldersResult = await getGroupTokenHolders($circles.circlesRpc, address);
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
                loadHoldings(),
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
        'collateral',
        'holders',
        'holdings',
        'offers',
        'explore_namespaces',
    ] as const;
    type TabId = TabIdOf<typeof TAB_IDS>;

    const tabPanelClass = 'p-4 bg-base-100 border-none';

    let selectedTab = $state<TabId>('common_connections');
    let commonConnectionsCount = $state(0);
    let trustsCount = $state(0);
    let trustedByCount = $state(0);

    const availableTabIds = $derived((() => {
        const ids: TabId[] = ['common_connections', 'trusts', 'trusted_by'];
        if (otherAvatar?.type === 'CrcV2_RegisterGroup') ids.push('collateral');
        if (otherAvatar?.type === 'CrcV2_RegisterGroup' || otherAvatar?.type === 'CrcV2_RegisterHuman') {
            ids.push('holders');
            ids.push('holdings');
        }
        ids.push('offers');
        ids.push('explore_namespaces');
        return ids;
    })());

    $effect(() => {
        // When conditional tabs appear/disappear, ensure `selectedTab` always points to a visible tab.
        if (!availableTabIds.includes(selectedTab)) {
            selectedTab = availableTabIds[0] ?? 'common_connections';
        }
    });
</script>

<div class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto">
    <Avatar view="vertical" clickable={false} {address}/>

    {#if trustRow}
        <span
                class="text-sm"
                class:text-green-600={trustRow?.relation === 'trusts' || trustRow?.relation === 'trustedBy' || trustRow?.relation === 'mutuallyTrusts'}
        >
            {formatTrustRelation(trustRow.relation, profile)}
        </span>
    {:else}
        <span class="text-sm text-gray-500">No relation available</span>
    {/if}

    <div class="my-6 flex flex-row gap-x-2">
        <span class="bg-base-200 rounded-lg px-2 py-1 text-sm">
            {getTypeString(otherAvatar?.type || '')}
        </span>
        <AddressComponent address={address ?? '0x0'}/>
        {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
            <button
                    onclick={() => {
                    goto('/groups/metrics/' + address);
                    popupControls.close();
                }}
                    class="flex items-center justify-center bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
            >
                <img src="/chart.svg" alt="Chart" class="w-4"/>
            </button>
        {/if}
        <JumpLink
                url={'https://gnosisscan.io/address/' + otherAvatar?.avatar}
                className="flex items-center justify-center bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
        >
            <img src="/external.svg" alt="External Link" class="w-4"/>
        </JumpLink>
    </div>

    <div class="w-[80%] sm:w-[60%] border-b border-[#E5E7EB]"></div>

    <div class="w-full flex justify-center mt-6 space-x-6">
        {#if !avatarState.isGroup}
            <button
                    class="btn btn-primary"
                    onclick={() => {
                popupControls.open({
                    title: 'Send Circles',
                    component: SelectAsset,
                    props: {
                        context: {
                            selectedAddress: otherAvatar?.avatar,
                        },
                    },
                });
            }}
            >
                <img src="/send-new.svg" alt="Send" class="w-5 h-5"/>
                Send
            </button>
        {/if}
        {#if otherAvatar?.type === 'CrcV2_RegisterGroup' && !!mintHandler && !avatarState.isGroup}
            <button
                    class="btn btn-primary"
                    onclick={() => {
                    popupControls.open({
                        title: 'Enter Amount',
                        component: SelectAmount,
                        props: {
                            asset: transitiveTransfer(),
                            selectedAddress: mintHandler,
                            transitiveOnly: true,
                            amount: 0,
                            context: {
                                selectedAddress: mintHandler,
                                transitiveOnly: true,
                                selectedAsset: transitiveTransfer(),
                                amount: 0,
                            },
                        },
                    });
                }}
            >
                Mint
            </button>
        {/if}
        {#if trustRow?.relation === 'trusts'}
            <button
                    class="btn btn-primary"
                    onclick={() => {
                    popupControls.open({
                        title: !avatarState.isGroup ? "Untrust" : "Remove member",
                        component: Untrust,
                        props: {
                            address: address,
                            trustVersion: trustVersion,
                        },
                    });
                }}
            >
                {!avatarState.isGroup ? "Untrust" : "Remove member"}
            </button>
        {:else if trustRow?.relation === 'mutuallyTrusts'}
            <button
                    class="btn btn-primary"
                    onclick={() => {
                    popupControls.open({
                        title: !avatarState.isGroup ? "Untrust" : "Remove member",
                        component: Untrust,
                        props: {
                            address: address,
                        },
                    });
                }}
            >
                {!avatarState.isGroup ? "Untrust" : "Remove member"}
            </button>
        {:else if trustRow?.relation === 'trustedBy'}
            <button
                    class="btn btn-primary"
                    onclick={() => {
                    popupControls.open({
                        title: !avatarState.isGroup ? "Trust back" : "Add member",
                        component: Trust,
                        props: {
                            address: address,
                        },
                    });
                }}
            >
                {!avatarState.isGroup ? "Trust back" : "Add as member"}
            </button>
        {:else}
            <button
                    class="btn btn-primary"
                    onclick={() => {
                    popupControls.open({
                        title: !avatarState.isGroup ? "Trust" : "Add as member",
                        component: Trust,
                        props: {
                            address: address,
                        },
                    });
                }}
            >
                {!avatarState.isGroup ? "Trust" : "Add as member"}
            </button>
        {/if}
    </div>
</div>

<Tabs
        id="profile-tabs"
        bind:selected={selectedTab}
        variant="boxed"
        size="sm"
        class="w-full p-0 mt-8"
        fitted={false}
>
    <Tab
            id="common_connections"
            title="Common connections"
            badge={commonConnectionsCount}
            panelClass={tabPanelClass}
    >
        <div class="w-full">
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
        <div class="w-full">
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
        <div class="w-full">
            <TrustRelationsList
                    avatarAddress={otherAvatar?.avatar}
                    relation="trustedBy"
                    bind:count={trustedByCount}
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
            <div class="w-full">
                {#if collateralLoading}
                    <div class="w-full py-6 text-center text-base-content/60">Loading…</div>
                {:else if collateralError}
                    <div class="w-full py-6 text-center text-error">{collateralError}</div>
                {:else}
                    <CollateralTable {collateralInTreasury}/>
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
            <div class="w-full">
                {#if holdersLoading}
                    <div class="w-full py-6 text-center text-base-content/60">Loading…</div>
                {:else if holdersError}
                    <div class="w-full py-6 text-center text-error">{holdersError}</div>
                {:else}
                    <HoldersList holders={tokenHolders} />
                {/if}
            </div>
        </Tab>

        <Tab
                id="holdings"
                title="Holdings"
                badge={holdings.length}
                panelClass={tabPanelClass}
        >
            <div class="w-full">
                {#if holdingsLoading}
                    <div class="w-full py-6 text-center text-base-content/60">Loading…</div>
                {:else if holdingsError}
                    <div class="w-full py-6 text-center text-error">{holdingsError}</div>
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
            <div class="flex items-center gap-2 text-base-content/70 py-2">
                <span class="loading loading-spinner loading-sm"></span>
                <span>Loading offers…</span>
            </div>
        {:else if offersError}
            <div class="alert alert-warning">
                <span>{offersError}</span>
                <button class="btn btn-xs ml-2" onclick={loadOffers}>Retry</button>
            </div>
        {:else}
            {#if offers.length === 0}
                <div class="text-sm opacity-70">No offers</div>
            {:else}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-sveltekit-preload-data="hover">
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
        <div class="space-y-3">
            {#if otherError}
                <div class="alert alert-error text-sm">{otherError}</div>
            {/if}

            {#if otherLoading}
                <div class="flex items-center gap-2 text-base-content/70 py-2">
                    <span class="loading loading-spinner loading-sm"></span>
                    <span>Loading namespaces…</span>
                </div>
            {:else if otherResolvedAvatar}
                <ProfileNamespaces avatar={otherResolvedAvatar} namespaces={otherNamespaces} readonly={true} />
            {:else}
                <div class="text-sm opacity-60">No avatar selected.</div>
            {/if}
        </div>
    </Tab>
</Tabs>
