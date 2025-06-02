<script lang="ts">
  let {
    asset = $bindable({
      address: '0xaf204776c7245bf4147c2612bf6e5972ee483701',
      name: 'sDAI',
      amount: 0,
    }),
    disabled = false,
    setLastEdited = () => {},
  }: { asset: { address: string; name: string; amount: number }; disabled?: boolean; setLastEdited: (lastEdited: 'group' | 'asset') => void } =
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
      amount: 0,
    };
  }

  function handleAmountChange(event: Event) {
    const amount = (event.target as HTMLInputElement).value;
    asset.amount = parseFloat(amount);
    setLastEdited(disabled ? 'group' : 'asset');
  }
</script>

<div class="flex items-center w-full px-2 gap-x-2">
  <input type="number" placeholder="Amount" class="input input-sm" value={asset.amount} oninput={handleAmountChange} />
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
