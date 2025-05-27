<script lang="ts">
  import { getConnectors, injected } from '@wagmi/core';
  import { config } from '../../config';
  import { connect } from '@wagmi/core';

  const connectors = getConnectors(config);
</script>

<div>
  {#each connectors as connector}
    <button
      class="flex w-full justify-between items-center text-black hover:bg-[#E8E1CF] py-4 p-2 first:rounded-t-lg last:rounded-b-lg"
      id={connector.id}
      onclick={() => {
        connect(config, { connector: connector });
      }}
    >
      {connector.name}
    </button>
  {/each}
</div>
