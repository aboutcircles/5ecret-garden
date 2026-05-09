<script lang="ts">
    import {goto} from '$app/navigation';
    import Address from '$lib/shared/ui/primitives/Address.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
    import { openStep } from '$lib/shared/flow';
    import {popupControls} from '$lib/shared/state/popup';
    import {signer} from '$lib/shared/state/wallet.svelte';
    import ProfileExplorer from '$lib/areas/profile/ui/ProfileExplorer.svelte';
    import type {Address as EvmAddress} from '@circles-sdk/utils';
    import {gnosisConfig} from "$lib/shared/config/circles";
    import { T } from '$lib/design-system/tokens.js';

    interface Props {
        address: EvmAddress | undefined;
    }

    let {address = undefined}: Props = $props();

    function changeWallet() {
        const target = signer.privateKey
            ? '/connect-wallet/import-circles-garden'
            : '/connect-wallet/connect-safe';

        popupControls.closeAndThen(() => {
            void goto(target);
        });
    }

    function openProfileEditor() {
        if (!address) return;
        openStep({
            title: 'Edit profile',
            component: ProfileExplorer,
            props: {
                avatar: address,
                pinApiBase: gnosisConfig.production.profilePinningServiceUrl,
            },
        });
    }
</script>

<div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px 0 8px;">
  <Avatar view="vertical" clickable={false} {address} />

  {#if address}
    <Address {address} />
  {/if}

  <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">
    <button
      onclick={changeWallet}
      style="height:36px;padding:0 18px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:13px;font-weight:580;cursor:pointer;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
    >Change Avatar</button>
    <button
      type="button"
      style="height:36px;padding:0 18px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.ink};font-size:13px;cursor:pointer;"
      onclick={openProfileEditor}
    >Edit profile</button>
  </div>

  <div style="border-radius:16px;overflow:hidden;box-shadow:{T.shadow.xs};">
    <QrCode value={address} />
  </div>
</div>
