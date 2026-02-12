<script lang="ts">
    import {goto} from '$app/navigation';
    import Address from '$lib/shared/ui/primitives/Address.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
    import { openStep } from '$lib/shared/flow/runtime';
    import {popupControls} from '$lib/shared/state/popup';
    import {signer} from '$lib/shared/state/wallet.svelte';
import ProfileExplorer from '$lib/areas/profile/ui/ProfileExplorer.svelte';
    import type {Address as EvmAddress} from '@circles-sdk/utils';
    import {gnosisConfig} from "$lib/shared/config/circles";

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
        openStep({
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
    {#if address}
        <div class="w-full flex justify-center">
            <Address {address} />
        </div>
    {/if}

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
    </div>

    <div class="shadow-lg rounded-lg">
        <QrCode value={address}/>
    </div>
</div>
