<script lang="ts">
  import { mintPolicies, type MintPolicy } from '$lib/utils/mintPolicy';

  interface Props {
    mintPolicy: MintPolicy;
    onupdate: (policy: MintPolicy) => void;
  }

  let { mintPolicy = $bindable(), onupdate }: Props = $props();

  function handleChange(event: Event) {
    const selectedAddress = (event.target as HTMLSelectElement).value;
    const selectedPolicy = mintPolicies.find(
      (p) => p.address === selectedAddress
    );
    if (selectedPolicy) {
      onupdate(selectedPolicy);
    }
  }
</script>

<select
  class="select select-sm select-bordered w-full"
  bind:value={mintPolicy.address}
  onchange={handleChange}
>
  {#each mintPolicies as policy (policy.address)}
    <option value={policy.address}>{policy.name}</option>
  {/each}
</select>
