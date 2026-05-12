<script lang="ts">
  import Profile from './Profile.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  const { address, trustVersion } = $props<{
    address?: Address;
    trustVersion?: number;
  }>();
</script>

<Profile {address} {trustVersion} />
