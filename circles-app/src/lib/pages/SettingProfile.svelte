<script lang="ts">
    import {goto} from '$app/navigation';
    import Address from '$lib/components/Address.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import QrCode from '$lib/components/QrCode.svelte';
    import {popupControls} from '$lib/stores/popUp';
    import {signer} from '$lib/stores/wallet.svelte';
    import ProfileExplorer from '$lib/flows/offer/ProfileExplorer.svelte';
    import {MARKET_API_BASE} from '$lib/config/market';
    import type {Address as EvmAddress} from '@circles-sdk/utils';

    interface Props {
        address: EvmAddress | undefined;
    }

    let {address = undefined}: Props = $props();

    function changeWallet() {
        popupControls.close();

        signer.privateKey
            ? goto('/connect-wallet/import-circles-garden')
            : goto('/connect-wallet/connect-safe');
    }

    function openProfileEditor() {
        if (!address) return;
        popupControls.open({
            title: 'Edit profile',
            component: ProfileExplorer,
            props: {
                avatar: address,
                pinApiBase: MARKET_API_BASE,
            },
        });
    }
</script>

<div
        class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto gap-y-4 mt-10"
>
    <Avatar view="vertical" clickable={false} {address}/>
    <div class="flex gap-x-2">
        <Address {address}/>
        <button
                onclick={changeWallet}
                class="btn btn-sm btn-primary"
        >Change Avatar
        </button>
        <button
                type="button"
                class="btn btn-sm btn-outline"
                onclick={openProfileEditor}
        >
            Edit profile
        </button>

        <!-- My orders: quick access to the local Orders list route -->
        <button
                type="button"
                class="btn btn-sm btn-outline"
                onclick={() => {
                popupControls.close();
                goto('/orders');
            }}
                aria-label="My orders"
        >
            My orders
        </button>
    </div>

    <div class="shadow-lg rounded-lg">
        <QrCode value={address}/>
    </div>
</div>
