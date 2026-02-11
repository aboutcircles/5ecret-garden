<script lang="ts">
    import {ethers} from 'ethers';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import type { SearchProfileResult } from '$lib/domains/profile/model';
    import {circles} from '$lib/shared/state/circles';
    import {get, writable} from 'svelte/store';
    import {onMount} from "svelte";
    import RowFrame from '$lib/shared/ui/RowFrame.svelte';
    import ListShell from '$lib/shared/ui/common/ListShell.svelte';
    import { createKeyboardListNavigator } from '$lib/shared/utils/keyboardListNavigator';
    import { SEARCH_POLICY } from '$lib/shared/utils/searchPolicies';
    import type { Address } from '@circles-sdk/utils';

    interface Props {
        selectedAddress?: any;
        searchType?: 'send' | 'group' | 'contact';
        oninvite?: (avatar: any) => void;
        ontrust?: (avatar: any) => void;
        onselect?: (avatar: any, profile?: SearchProfileResult) => void;
        avatarTypes?: string[]
    }

    let {selectedAddress = $bindable(undefined), searchType = 'send', oninvite, ontrust, onselect, avatarTypes}: Props = $props();
    const query = writable('');
    let lastQuery: string = $state('');
    let result: SearchProfileResult[] = $state([]);
    let loading = $state(false);
    let error: string | null = $state(null);
    let searchInputEl: HTMLInputElement | null = $state(null);
    let resultsListEl: HTMLDivElement | null = $state(null);

    function focusSearchInput() {
        searchInputEl?.focus();
    }

    const searchListNavigator = createKeyboardListNavigator({
        getRows: () => Array.from(resultsListEl?.querySelectorAll<HTMLElement>('[data-search-row]') ?? []),
        focusInput: focusSearchInput,
        onActivateRow: (row) => {
            const index = Number(row.dataset.searchIndex ?? -1);
            const item = result[index];
            if (!item) return;
            onselect?.(item.address, item);
        }
    });

    function onSearchRowClick(event: MouseEvent) {
        searchListNavigator.onRowClick(event);
    }

    function toSearchResult(raw: any | null | undefined): SearchProfileResult | undefined {
        if (!raw || typeof raw !== 'object') return undefined;

        const base = raw ?? { name: '' };
        const address = typeof raw.address === 'string' ? raw.address : (typeof raw.owner === 'string' ? raw.owner : '');
        const lastUpdatedAt = typeof raw.lastUpdatedAt === 'number' ? raw.lastUpdatedAt : undefined;
        const registeredName = typeof raw.registeredName === 'string' ? raw.registeredName : null;
        const avatarType = typeof raw.avatarType === 'string' ? raw.avatarType : (typeof raw.type === 'string' ? raw.type : undefined);

        return {
            address,
            name: base.name,
            description: base.description,
            lastUpdatedAt,
            registeredName,
            imageUrl: base.imageUrl,
            previewImageUrl: base.previewImageUrl,
            location: base.location,
            avatarType
        } as SearchProfileResult;
    }

    async function rpcSearchByText(query: string, limit: number, offset = 0, avatarTypes:string[]|undefined = undefined): Promise<SearchProfileResult[]> {
        const sdk = get(circles);
        if (!sdk?.circlesRpc) throw new Error('No circles RPC available');
        const raw = await sdk.circlesRpc.call<any>('circles_searchProfiles', [query, limit, offset, avatarTypes]);
        const list: any[] = Array.isArray(raw?.result) ? raw.result : [];
        return list.map(toSearchResult).filter(Boolean) as SearchProfileResult[];
    }

    async function searchProfiles(q: string) {
        loading = true;
        error = null;
        try {
            const limit = SEARCH_POLICY.DEFAULT_REMOTE_LIMIT;
            let results: SearchProfileResult[] = [];

            if (q.trim() !== '') {
                const nameResults = await rpcSearchByText(q, limit, undefined, avatarTypes);
                results = [...nameResults];

                if (searchType === 'send') {
                    const needle = q.toLowerCase();
                    const found = results.some(r => (r.address ?? '').toLowerCase() === needle);
                    if (!found && ethers.isAddress(q)) {
                        const synthetic: SearchProfileResult = {
                            address: q as Address,
                            name: q,
                            lastUpdatedAt: undefined,
                            registeredName: null
                        };
                        results.unshift(synthetic);
                    }
                }
            }
            result = results;
        } catch (error) {
            console.error('Error searching profiles:', error);
            error = error instanceof Error ? error.message : 'Error searching profiles';
            result = [];
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        // Keep external binding in sync with the toolbar query.
        selectedAddress = $query;
    });

    $effect(() => {
        const q = ($query ?? '').toString();

        if (q.trim() === '') {
            if (lastQuery === '') {
                return;
            }
            lastQuery = '';
            loading = true;
            error = null;
            rpcSearchByText('a', SEARCH_POLICY.DEFAULT_BOOTSTRAP_LIMIT, 0)
                .then(r => (result = r.slice(0, SEARCH_POLICY.DEFAULT_BOOTSTRAP_LIMIT)))
                .catch(err => {
                    console.error('Error loading default results:', err);
                    error = err instanceof Error ? err.message : 'Error loading default results';
                    result = [];
                })
                .finally(() => {
                    loading = false;
                });
            return;
        }

        if (q !== lastQuery) {
            lastQuery = q;
            void searchProfiles(q);
        }
    });

    onMount(async() => {
        result = await rpcSearchByText(
            SEARCH_POLICY.DEFAULT_BOOTSTRAP_QUERY,
            SEARCH_POLICY.DEFAULT_BOOTSTRAP_LIMIT,
            0,
            avatarTypes
        );
    });

    function avatarTypeToReadable(type?: string) : string {
        if (type === "CrcV2_RegisterHuman") return "Human";
        if (type === "CrcV2_RegisterGroup") return "Group";
        if (type === "CrcV2_RegisterOrganization") return "Organization";
        return "";
    }
</script>

<div class="mt-4" data-search-avatar-list-scope>
    <p class="menu-title pl-0">
        {#if searchType === 'send'}Recipient{:else if searchType === 'contact'}Found Account{:else}Group{/if}
    </p>

    <ListShell
        query={query}
        searchPlaceholder="Search by name or address"
        bind:inputEl={searchInputEl}
        onInputKeydown={searchListNavigator.onInputArrowDown}
        {loading}
        {error}
        wrapInListContainer={false}
    >
        {#if result.length > 0}
            <div bind:this={resultsListEl} class="w-full flex flex-col gap-y-1.5" role="list">
                {#each result as profile, index}
                    <div
                        tabindex={0}
                        role="button"
                        data-search-row
                        data-search-index={index}
                        onkeydown={searchListNavigator.onRowKeydown}
                        onclick={onSearchRowClick}
                        class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <RowFrame clickable={true} dense={true} noLeading={true} onclick={() => onselect && onselect(profile.address, profile)}>
                            <div class="min-w-0">
                                <Avatar
                                        address={profile.address}
                                        view="horizontal"
                                        bottomInfo={avatarTypeToReadable(profile.avatarType ?? '')}
                                        clickable={false}
                                />
                            </div>
                            {#snippet trailing()}<div aria-hidden="true">
                                <img src="/chevron-right.svg" alt="" class="icon" />
                            </div>{/snippet}
                        </RowFrame>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="text-center">
                <div>
                    {#if ethers.isAddress($query) && searchType === 'contact'}
                        <button class="btn mt-6" onclick={() => oninvite && oninvite($query)}>
                            Invite {$query}
                        </button>
                        {#if ontrust}
                            <br/>
                            <button class="btn mt-6" onclick={() => ontrust && ontrust($query)}>
                                Trust {$query}
                            </button>
                        {/if}
                    {:else}
                        <p>No accounts found.</p>
                    {/if}
                </div>
            </div>
        {/if}
    </ListShell>
</div>
