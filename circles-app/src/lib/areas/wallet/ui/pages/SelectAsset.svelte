<script lang="ts" module>
    import { get } from 'svelte/store';
    import { totalCirclesBalance } from '$lib/shared/state/totalCirclesBalance';

    type HexAddress = `0x${string}`;

    export const TransitiveTransferTokenOwner =
        '0x0000000000000000000000000000000000000001' as HexAddress;
    export const TransitiveTransferTokenAddress =
        '0x0000000000000000000000000000000000000002' as HexAddress;

    export function tokenTypeToString(tokenType: string) {
        if (!tokenType) {
            return 'Circles (v1)';
        }
        switch (tokenType) {
            case 'CrcV2_RegisterHuman':
                return 'Personal Circles';
            case 'CrcV1_Signup':
                return 'Personal Circles (v1)';
            case 'CrcV2_ERC20WrapperDeployed_Demurraged':
                return 'ERC20 Wrapper (Demurraged)';
            case 'CrcV2_ERC20WrapperDeployed_Inflationary':
                return 'ERC20 Wrapper (Inflationary)';
            case 'CrcV2_RegisterGroup':
                return 'Group Circles';
            case 'TransitiveTransfer':
                return 'Auto route';
            default:
                return tokenType;
        }
    }

    export const transitiveTransfer = () => {
        return {
            tokenOwner: TransitiveTransferTokenOwner,
            tokenType: 'TransitiveTransfer',
            circles: get(totalCirclesBalance),
            staticCircles: 0,
            crc: 0,
            tokenAddress: TransitiveTransferTokenAddress,
            tokenId: '0',
            isWrapped: false,
            isGroup: false,
            isInflationary: false,
            staticAttoCircles: '0',
            version: 0,
            attoCrc: '0',
            attoCircles: '0',
            isErc20: false,
            isErc1155: false,
        } as any;
    };
</script>

<script lang="ts">
    import type { TokenBalanceRow } from '@aboutcircles/sdk-types';
    import { writable } from 'svelte/store';
    import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
    import type { Readable } from 'svelte/store';
    import { derived, readable } from 'svelte/store';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import SelectableBalanceRow, { type SelectableBalanceRowItem } from '$lib/areas/wallet/ui/components/SelectableBalanceRow.svelte';
    import BalanceRowPlaceholder from '$lib/shared/ui/lists/placeholders/BalanceRowPlaceholder.svelte';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import { roundToDecimals } from '$lib/shared/utils/shared';
    import AutoRouteSummary from '$lib/areas/wallet/ui/components/AutoRouteSummary.svelte';

    interface Props {
        balances: Readable<{
            data: TokenBalanceRow[];
            next: () => Promise<boolean>;
            ended: boolean;
        }>;
        selectedAsset?: TokenBalanceRow | undefined;
        showTransitive?: boolean;
        inputDataAttribute?: string;
        onselect: (tokenBalanceRow: TokenBalanceRow) => void;
    }

    let {
        balances,
        selectedAsset = $bindable(undefined),
        showTransitive = true,
        inputDataAttribute,
        onselect,
    }: Props = $props();
    const query = writable('');
    let selectAssetListScopeEl: HTMLDivElement | null = $state(null);

    const handleSelect = (tokenBalanceRow: TokenBalanceRow) => {
        selectedAsset = tokenBalanceRow;
        onselect(tokenBalanceRow);
    };

    const emptySelectable = readable<{ data: SelectableBalanceRowItem[]; next: () => Promise<boolean>; ended: boolean }>({
        data: [],
        next: async () => true,
        ended: true
    });

    // Avoid Svelte 5 `state_referenced_locally` by creating derived stores inside an effect.
    let selectableBalances = $state<Readable<{ data: SelectableBalanceRowItem[]; next: () => Promise<boolean>; ended: boolean }>>(emptySelectable);

    $effect(() => {
        selectableBalances = derived([balances, query], ([$balances, $query]) => {
            const q = ($query ?? '').toLowerCase().trim();
            const rows = ($balances?.data ?? []).filter((balance) => {
                if (!q) return true;
                const owner = String(balance.tokenOwner ?? '').toLowerCase();
                const token = String(balance.tokenAddress ?? '').toLowerCase();
                return owner.includes(q) || token.includes(q);
            });

            const data: SelectableBalanceRowItem[] = rows.map((balance) => ({
                balance,
                onSelect: () => handleSelect(balance)
            }));

            return {
                data,
                next: $balances?.next ?? (async () => true),
                ended: $balances?.ended ?? true
            };
        });
    });

    const onSearchInputKeydown = createListInputArrowDownHandler({
        getScope: () => selectAssetListScopeEl,
        rowSelector: '[data-balance-row]'
    });
</script>

{#if showTransitive}
    <button
            type="button"
            class="w-full text-left bg-transparent border-0 p-0"
            data-send-step-initial-focus
            onclick={() => handleSelect(transitiveTransfer())}
    >
        <RowFrame clickable={true} noLeading={true} className="border-primary/30 bg-primary/5">
            <div class="w-full flex items-center justify-between">
                <div class="min-w-0">
                    <AutoRouteSummary />
                </div>
                <div class="text-right text-sm text-base-content/70">
                    {roundToDecimals(transitiveTransfer().circles)} Circles
                </div>
            </div>
        </RowFrame>
    </button>
{/if}

<p class="menu-title pl-0 mt-4">Individual tokens</p>

<ListShell
        query={query}
        searchPlaceholder="Search by owner or token address"
        inputDataAttribute={`data-select-asset-search-input ${inputDataAttribute ?? ''}`}
        onInputKeydown={onSearchInputKeydown}
        isEmpty={$balances?.data?.length === 0}
        ended={$balances?.ended ?? false}
        emptyRequiresEnd={true}
        isNoMatches={$balances?.data?.length > 0 && $selectableBalances.data.length === 0}
        emptyLabel="You don't have any trusted assets"
        noMatchesLabel="No matching assets"
        wrapInListContainer={false}
>
    <div data-select-asset-list-scope bind:this={selectAssetListScopeEl}>
        <GenericList
                store={selectableBalances}
                row={SelectableBalanceRow}
                getKey={(it) => String(it.balance.tokenAddress)}
                rowHeight={64}
                maxPlaceholderPages={1}
                expectedPageSize={25}
                placeholderRow={BalanceRowPlaceholder}
        />
    </div>
</ListShell>
