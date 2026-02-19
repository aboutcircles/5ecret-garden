<script lang="ts">
  import Profile from './Profile.svelte';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    address?: Address;
  }

  let { address }: Props = $props();
</script>

<Profile {address} />
