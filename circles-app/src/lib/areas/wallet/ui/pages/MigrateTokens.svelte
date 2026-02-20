<script lang="ts">
  import { circles } from '$lib/shared/state/circles';
  import PopupActionBar from '$lib/shared/ui/shell/PopupActionBar.svelte';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import type { TokenBalance } from '@aboutcircles/sdk-types';
  import { runTask } from '$lib/shared/utils/tasks';
  import { tokenTypeToString } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  interface Props {
    asset: TokenBalance;
  }

  let { asset }: Props = $props();

  async function migrate() {
    if (!$circles || !avatarState.avatar) {
      return;
    }

    const tokenInfo = await $circles?.rpc?.token?.getTokenInfo(asset.tokenAddress);
    if (!tokenInfo) {
      return;
    }
    if (tokenInfo.version !== 1) {
      throw new Error(
        `Token ${tokenInfo.tokenAddress} is not a v1 token and can't be migrated.`
      );
    }

    // TODO: New SDK (@aboutcircles/sdk) does not expose migrateV1TokensBatch().
    // Migration requires direct contract interaction with the migration contract
    // at the address in circlesConfig.migrationAddress. Implement when SDK adds support.
    throw new Error(
      `V1 token migration is not yet supported by the new SDK. Token: ${asset.tokenAddress}`
    );

    popupControls.close();
  }
</script>

<div class="p-6 pt-0">
  <div class="form-control mb-4">
    <p class="menu-title pl-0">Token</p>
    <BalanceRow item={asset} />
  </div>

  <PopupActionBar>
    <button type="submit" class="btn btn-primary btn-sm" onclick={migrate}
      >Migrate</button
    >
  </PopupActionBar>
</div>
