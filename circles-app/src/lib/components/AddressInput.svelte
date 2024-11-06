<!-- AddressInput.svelte -->
<script lang="ts">
  import { ethers } from 'ethers6';
  import { Html5QrcodeScanner } from 'html5-qrcode';
  import { createEventDispatcher, onMount } from 'svelte';

  export let address: string | undefined = undefined;

  let input: HTMLInputElement;
  let editorText: string | undefined = undefined;
  let isScanning = false;

  const eventDispatcher = createEventDispatcher();

  onMount(() => {
    if (address && input) {
      editorText = address;
      input.value = editorText;
    }
  });

  const handleInput = (e: Event) => {
    editorText = (e.target as HTMLInputElement).value;
    if (ethers.isAddress(editorText)) {
      address = editorText;
      console.log('event dispatcher', address);
      eventDispatcher('addressChange', { address });
    } else if (editorText == '') {
      address = '';
      eventDispatcher('addressChange', { address });
    }
  };

  function openQrScanner() {
    isScanning = true;

    const qrCodeScanner = new Html5QrcodeScanner(
      'qr-scanner',
      { fps: 10, qrbox: 250 },
      false
    );

    qrCodeScanner.render(
      (decodedText) => {
        if (ethers.isAddress(decodedText)) {
          editorText = decodedText;
          input.value = decodedText;
          address = decodedText;
          eventDispatcher('addressChange', { address });
          qrCodeScanner.clear();
          isScanning = false;
        } else {
          alert('Scanned code is not a valid Ethereum address.');
        }
      },
      (errorMessage) => {
        console.error(errorMessage);
      }
    );
  }
</script>

<div class="flex item-center w-full gap-x-2">
  <input
    bind:this={input}
    type="text"
    class="input input-bordered bg-gray-100 flex-1"
    placeholder="Enter or scan Ethereum address"
    on:input={handleInput}
    on:paste={handleInput}
    on:cut={handleInput}
  />
  <button on:click={openQrScanner} class="btn btn-square md:hidden"
    ><img src="/qr-code.svg" alt="QR Code" class="w-6" /></button
  >
</div>

{#if isScanning}
  <div class="fixed top-0 left-0 w-screen h-screen z-100">
    <div id="qr-scanner"></div>
  </div>
{/if}
