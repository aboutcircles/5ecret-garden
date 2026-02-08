<script lang="ts">
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { GatewayRow as GatewayRowType } from '$lib/areas/settings/model/gatewayTypes';
  import { popupControls } from '$lib/shared/state/popup';
  import ManageTrust from '$lib/areas/settings/flows/gateway/ManageTrust.svelte';

  interface Props {
    item: GatewayRowType;
  }

  let { item }: Props = $props();

  const createdAt = $derived.by(() =>
    item.timestamp ? new Date(Number(item.timestamp) * 1000).toLocaleString() : ''
  );

  function openManageTrust() {
    if (!item?.gateway) return;
    popupControls.open({
      title: 'Manage trust',
      component: ManageTrust,
      props: { gateway: item.gateway }
    });
  }
</script>

<RowFrame clickable={true} dense={true} noLeading={true} onclick={openManageTrust}>
  <div class="w-full flex items-center justify-between gap-3">
    <div class="min-w-0 flex items-center gap-2">
      <Avatar
        address={item.gateway}
        view="horizontal"
        clickable={true}
        bottomInfo={createdAt ? `Created ${createdAt}` : undefined}
      />
    </div>
    {#snippet trailing()}
      <div aria-hidden="true">
        <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
      </div>
    {/snippet}
  </div>
</RowFrame>
