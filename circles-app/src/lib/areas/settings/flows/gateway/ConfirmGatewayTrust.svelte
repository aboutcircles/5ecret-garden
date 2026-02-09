<script lang="ts">
  import GatewayTrustActionConfirm from '$lib/areas/settings/flows/gateway/GatewayTrustActionConfirm.svelte';

  interface Props {
    gateway: string;
    trustReceiver: string;
    onTrusted?: () => void | Promise<void>;
  }

  let { gateway, trustReceiver, onTrusted }: Props = $props();
</script>

<GatewayTrustActionConfirm
  mode="trust"
  {gateway}
  {trustReceiver}
  onComplete={onTrusted}
/>