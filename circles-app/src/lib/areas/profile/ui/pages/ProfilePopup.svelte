<script lang="ts">
  import Profile from './Profile.svelte';
  import type { Address } from '@circles-sdk/utils';
  const { address, trustVersion } = $props<{
    address?: Address;
    trustVersion?: number;
  }>();
</script>

<Profile {address} {trustVersion} />
