<script lang="ts">
  // Compatibility wrapper to avoid duplicate implementations.
  // Delegate to the canonical ProfilePopup wrapper to prevent drift.
  import ProfilePopup from './ProfilePopup.svelte';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    address?: Address;
  }

  let { address }: Props = $props();
</script>

<ProfilePopup {address} />
