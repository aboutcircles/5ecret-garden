<script lang="ts">
  import { circles } from '$lib/stores/circles';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import { runTask } from '$lib/utils/tasks';
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { popupControls } from '$lib/stores/popUp';
  interface Props {
    asset: TokenBalanceRow;
  }

  let { asset }: Props = $props();

  async function migrate() {
    if (!$circles || !avatarState.avatar) {
      return;
    }

    const tokenInfo = await $circles?.data?.getTokenInfo(asset.tokenAddress);
    if (!tokenInfo) {
      return;
    }
    if (tokenInfo.version !== 1) {
      throw new Error(
        `Token ${tokenInfo.token} is not a v1 token and can't be migrated.`
      );
    }

    runTask({
      name: `Migrate ${tokenTypeToString(asset.tokenType)} to v2...`,
      promise: $circles.migrateV1TokensBatch(avatarState.avatar.address, [
        asset.tokenAddress,
      ]),
    });

    popupControls.close();
  }
</script>

<div class="p-6 pt-0">
  <div class="form-control mb-4">
    <p class="menu-title pl-0">Token</p>
    <BalanceRow item={asset} />
  </div>

  <div class="modal-action">
    <button type="submit" class="btn btn-primary" onclick={migrate}
      >Migrate</button
    >
  </div>
</div>
