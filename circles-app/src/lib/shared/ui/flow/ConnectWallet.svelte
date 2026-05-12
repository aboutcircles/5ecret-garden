<script lang="ts">
  // Re-export from canonical location
  import ConnectWallet from '$lib/areas/wallet/ui/onboarding/ConnectWallet.svelte';

  interface Props {
    imgUrl: string;
    header: string;
    desc: string;
    route: string;
    recommended?: 'Connect' | 'Register' | undefined;
  }

  let { imgUrl, header, desc, route, recommended }: Props = $props();
</script>

<ConnectWallet {imgUrl} {header} {desc} {route} {recommended} />
