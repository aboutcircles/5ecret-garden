<script lang="ts">
  let {
    asset = '0xaf204776c7245bf4147c2612bf6e5972ee483701',
  }: { asset: string } = $props();
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
</script>

<div class="flex items-center w-full px-2">
  <input type="text" placeholder="Amount" class="input" />
  <button class="btn" onclick={() => modal.showModal()}>{asset}</button>
  <dialog bind:this={modal} class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">Select a token</h3>
      <input type="text" placeholder="Search" class="input w-full" />
      <div class="list">
        {#each tokens as token}
          <div class="list-row">
            <!-- <img src={token.address} alt={token.name} class="w-10 h-10" /> -->
            <span>{token.name}</span>
          </div>
        {/each}
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</div>
