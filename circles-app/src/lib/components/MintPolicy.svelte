<script lang="ts">
  import { mintPolicies, type MintPolicy } from '$lib/utils/mintPolicy';
  import { createEventDispatcher } from 'svelte';

  export let mintPolicy: MintPolicy;
  const dispatch = createEventDispatcher();

  function handleChange(event: Event) {
    const selectedAddress = (event.target as HTMLSelectElement).value;
    const selectedPolicy = mintPolicies.find(
      (p) => p.address === selectedAddress
    );
    if (selectedPolicy) {
      dispatch('update', selectedPolicy);
    }
  }
</script>

<select
  class="select select-sm select-bordered w-full"
  bind:value={mintPolicy.address}
  on:change={handleChange}
>
  {#each mintPolicies as policy (policy.address)}
    <option value={policy.address}>{policy.name}</option>
  {/each}
</select>
