<script lang="ts">
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { GatewayRow as GatewayRowType } from './types';
  import { popupControls } from '$lib/stores/popUp';
  import ManageTrust from '$lib/flows/paymentGateway/ManageTrust.svelte';

  interface Props {
    item: GatewayRowType;
  }

  let { item }: Props = $props();

  const createdAt = $derived(() =>
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

<RowFrame clickable={true} dense={true} noLeading={true} on:click={openManageTrust}>
  <div class="w-full flex items-center justify-between gap-3">
    <div class="min-w-0 flex items-center gap-2">
      <Avatar address={item.gateway} view="horizontal" clickable={true} />
      <div class="flex flex-col min-w-0">
        <div class="font-mono text-xs truncate">{item.gateway}</div>
        {#if createdAt}
          <div class="text-xs text-base-content/70">Created {createdAt}</div>
        {/if}
      </div>
    </div>
  </div>
</RowFrame>
