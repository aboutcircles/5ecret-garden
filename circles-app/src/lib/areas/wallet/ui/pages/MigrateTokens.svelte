<script lang="ts">
  import { circles } from '$lib/shared/state/circles';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import { executeTxSubmitFirst } from '$lib/shared/utils/txExecution';
  import { tokenTypeToString } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    asset: TokenBalanceRow;
  }

  let { asset }: Props = $props();

  async function migrate() {
    if (!$circles || !avatarState.avatar) return;
    const avatarAddress = avatarState.avatar.address;

    const tokenInfo = await $circles?.data?.getTokenInfo(asset.tokenAddress);
    if (!tokenInfo) return;
    if (tokenInfo.version !== 1) {
      throw new Error(`Token ${tokenInfo.token} is not a v1 token and can't be migrated.`);
    }

    void executeTxSubmitFirst({
      name: `Migrate ${tokenTypeToString(asset.tokenType)} to v2...`,
      submit: () => $circles.migrateV1TokensBatch(avatarAddress, [asset.tokenAddress]),
      onSubmitted: () => popupControls.close(),
    });
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;padding:0 0 4px;">
  <div style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;padding:10px 12px;">
    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin:0 0 6px 2px;display:block;">Token</span>
    <BalanceRow item={asset} />
  </div>

  <p style="font-size:12px;color:{T.inkMuted};margin:0;line-height:1.5;">
    Migrating moves your v1 token balance to the Circles v2 protocol.
  </p>

  <div style="display:flex;justify-content:flex-end;">
    <button
      type="button"
      style="height:40px;padding:0 22px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-size:13px;font-weight:580;cursor:pointer;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
      onclick={migrate}
    >Migrate</button>
  </div>
</div>
