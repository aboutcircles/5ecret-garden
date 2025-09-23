<script lang="ts">
    import {ethers} from 'ethers';
    import AddressInput from '$lib/components/AddressInput.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import type {Address} from '@circles-sdk/utils';
    import type {Profile, SearchResultProfile} from '@circles-sdk/profiles';
    import {circles} from '$lib/stores/circles';
    import {get} from 'svelte/store';
    import {onMount} from "svelte";
    import RowFrame from '$lib/ui/RowFrame.svelte';

    interface Props {
        selectedAddress?: any;
        searchType?: 'send' | 'group' | 'contact';
        oninvite?: (avatar: any) => void;
        ontrust?: (avatar: any) => void;
        onselect?: (avatar: any) => void;
        avatarTypes?: string[]
    }

    let {selectedAddress = $bindable(undefined), searchType = 'send', oninvite, ontrust, onselect, avatarTypes}: Props = $props();
    let lastAddress: string = $state('');
    let result: SearchResultProfile[] = $state([]);

    function toSearchResult(raw: any | null | undefined): SearchResultProfile | undefined {
        if (!raw || typeof raw !== 'object') return undefined;

        const base = raw ?? {name: ''};
        const CID = typeof raw.CID === 'string' ? raw.CID : (typeof raw.cid === 'string' ? raw.cid : '');
        const address = typeof raw.address === 'string' ? raw.address : (typeof raw.owner === 'string' ? raw.owner : '');
        const lastUpdatedAt = typeof raw.lastUpdatedAt === 'number' ? raw.lastUpdatedAt : 0;
        const registeredName = typeof raw.registeredName === 'string' ? raw.registeredName : null;

        return {
            ...base,
            name: base.name,
            description: base.description,
            CID,
            lastUpdatedAt,
            address,
            registeredName,
            imageUrl: base.imageUrl,
            previewImageUrl: base.previewImageUrl,
            location: base.location,
            geoLocation: base.geoLocation
        };
    }

    async function rpcSearchByText(query: string, limit: number, offset = 0, avatarTypes:string[]|undefined = undefined): Promise<SearchResultProfile[]> {
        const sdk = get(circles);
        if (!sdk?.circlesRpc) throw new Error('No circles RPC available');
        const raw = await sdk.circlesRpc.call<Profile[]>('circles_searchProfiles', [query, limit, offset, avatarTypes]);
        return (raw.result ?? []).map(toSearchResult).filter(Boolean) as SearchResultProfile[];
    }

    async function searchProfiles() {
        try {
            const q = selectedAddress?.toString() ?? '';
            const limit = 50;
            let results: SearchResultProfile[] = [];

            if (q.trim() !== '') {
                const nameResults = await rpcSearchByText(q, limit, undefined, avatarTypes);
                results = [...nameResults];

                if (searchType === 'send') {
                    const needle = q.toLowerCase();
                    const found = results.some(r => (r.address ?? '').toLowerCase() === needle);
                    if (!found && ethers.isAddress(q)) {
                        const synthetic: SearchResultProfile = {
                            address: q,
                            name: q,
                            CID: '',
                            lastUpdatedAt: 0,
                            registeredName: null
                        };
                        results.unshift(synthetic);
                    }
                }
            }
            result = results;
        } catch (error) {
            console.error('Error searching profiles:', error);
            result = [];
        }
    }

    $effect(() => {
        if (!selectedAddress || selectedAddress.toString().trim() === '') {
            rpcSearchByText('a', 25, 0).then(r => (result = r.slice(0, 25))).catch(err => {
                console.error('Error loading default results:', err);
                result = [];
            });
        }
    });

    $effect(() => {
        if (selectedAddress && selectedAddress !== lastAddress) {
            lastAddress = selectedAddress;
            searchProfiles();
        }
    });

    onMount(async() => {
        result = await rpcSearchByText('Circles', 25, 0, avatarTypes);
    });

    function avatarTypeToReadable(type:string) : string {
        if (type === "CrcV2_RegisterHuman") return "Human";
        if (type === "CrcV2_RegisterGroup") return "Group";
        if (type === "CrcV2_RegisterOrganization") return "Organization";
        return "";
    }
</script>

<div class="form-control my-4">
    <AddressInput bind:address={selectedAddress}/>
</div>

<div class="mt-4">
    <p class="menu-title pl-0">
        {#if searchType === 'send'}Recipient{:else if searchType === 'contact'}Found Account{:else}Group{/if}
    </p>

    {#if result.length > 0}
        <div class="w-full flex flex-col gap-y-1.5">
            {#each result as profile}
                <RowFrame clickable={true} dense={true} noLeading={true} on:click={() => onselect && onselect(profile.address)}>
                    <div class="min-w-0">
                        <Avatar
                                address={profile.address as Address}
                                view="horizontal"
                                bottomInfo={avatarTypeToReadable(profile.avatarType)}
                                clickable={false}
                        />
                    </div>
                    <div slot="trailing" aria-hidden="true">
                        <img src="/chevron-right.svg" alt="" class="icon" />
                    </div>
                </RowFrame>
            {/each}
        </div>
    {:else}
        <div class="text-center">
            <div>
                {#if ethers.isAddress(selectedAddress) && searchType === 'contact'}
                    <button class="btn mt-6" onclick={() => oninvite && oninvite(selectedAddress)}>
                        Invite {selectedAddress}
                    </button>
                    {#if ontrust}
                        <br/>
                        <button class="btn mt-6" onclick={() => ontrust && ontrust(selectedAddress)}>
                            Trust {selectedAddress}
                        </button>
                    {/if}
                {:else}
                    <p>No accounts found.</p>
                {/if}
            </div>
        </div>
    {/if}
</div>
