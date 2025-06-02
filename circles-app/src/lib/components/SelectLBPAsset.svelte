<script lang="ts">
  let {
    asset = {
      address: '0xaf204776c7245bf4147c2612bf6e5972ee483701',
      name: 'sDAI',
    },
    disabled = false,
    amount = $bindable(0),
  }: { asset?: { address: string; name: string }; disabled?: boolean; amount?: number } =
    $props();
  let modal: HTMLDialogElement;

  const tokens = [
    {
      address: '0xaf204776c7245bf4147c2612bf6e5972ee483701',
      name: 'sDAI',
    },
    {
      address: '0x9c58bacc331c9aa871afd802db6379a98e80cedb',
      name: 'GNO',
    },
    {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      name: 'WETH',
    },
    {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      name: 'USDC',
    },
  ];

  function selectToken(token: any) {
    asset = token;
    modal.close();
  }

  function handleTokenSearch(event: Event) {
    const searchValue = (event.target as HTMLInputElement).value;
    asset = {
      address: searchValue,
      name: 'Custom',
    };
  }
</script>

<div class="flex items-center w-full px-2 gap-x-2">
  <input type="number" placeholder="Amount" class="input input-sm" bind:value={amount} />
  <button class="btn btn-sm" onclick={() => modal.showModal()} {disabled}
    >{asset.name}</button
  >
  <dialog bind:this={modal} class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">Select a token</h3>
      <input
        type="text"
        placeholder="Token Address"
        class="input validator w-full mb-4"
        pattern="0x[a-fA-F0-9]{40}"
        title="Invalid token address"
        oninput={handleTokenSearch}
      />
      <div class="space-y-2">
        {#each tokens as token}
          <button
            class="flex items-center gap-3 p-3 w-full hover:bg-base-200 rounded-lg"
            onclick={() => selectToken(token)}
          >
            <span class="font-medium">{token.name}</span>
          </button>
        {/each}
      </div>
    </div>
  </dialog>
</div>
