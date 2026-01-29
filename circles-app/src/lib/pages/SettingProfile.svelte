<script lang="ts">
    import {goto} from '$app/navigation';
    import Address from '$lib/components/Address.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import QrCode from '$lib/components/QrCode.svelte';
    import {popupControls} from '$lib/stores/popup';
    import {signer} from '$lib/stores/wallet.svelte';
    import ProfileExplorer from '$lib/profile/ProfileExplorer.svelte';
    import type {Address as EvmAddress} from '@circles-sdk/utils';
    import {gnosisConfig} from "$lib/circlesConfig";

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
                pinApiBase: gnosisConfig.production.marketApiBase,
            },
        });
    }
</script>

<div
        class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto gap-y-4 mt-10"
>
    <Avatar view="vertical" clickable={false} {address}/>

    <!-- Address chip on its own line -->
    <div class="w-full flex justify-center">
        <Address {address} />
    </div>

    <!-- Buttons row below, centered -->
    <div class="flex flex-wrap justify-center gap-2">
        <button
            onclick={changeWallet}
            class="btn btn-sm btn-primary"
        >
            Change Avatar
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
