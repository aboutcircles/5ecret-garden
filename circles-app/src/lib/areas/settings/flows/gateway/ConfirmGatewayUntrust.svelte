<script lang="ts">
  import GatewayTrustActionConfirm from '$lib/areas/settings/flows/gateway/GatewayTrustActionConfirm.svelte';

  interface Props {
    gateway: string;
    trustReceiver: string;
    onDone?: () => void | Promise<void>;
  }

  let { gateway, trustReceiver, onDone }: Props = $props();
</script>

<GatewayTrustActionConfirm
  mode="untrust"
  {gateway}
  {trustReceiver}
  onComplete={onDone}
/>