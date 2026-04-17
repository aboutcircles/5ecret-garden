<!-- AddressInput.svelte -->
<script lang="ts">
  import { ethers } from 'ethers';
  import { Html5Qrcode } from 'html5-qrcode';
  import { onMount } from 'svelte';

  interface Props {
    address?: string | undefined;
  }

  let { address = $bindable(undefined) }: Props = $props();

  let input: HTMLInputElement | undefined = $state();
  let editorText: string | undefined = undefined;
  let isScanning = $state(false);
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  const qrCodeRegionId = 'qr-scanner';

  onMount(() => {
    if (address && input) {
      editorText = address;
      input.value = editorText;
    }
  });

  const handleInput = (e: Event) => {
    editorText = (e.target as HTMLInputElement).value;

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      address = editorText;
    }, 300);
  };

  async function openQrScanner() {
    isScanning = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        /**
         * devices would be an array of objects of type:
         * { id: "id", label: "label" }
         */
        if (devices && devices.length) {
          // .. use this to start scanning.
          const html5QrCode = new Html5Qrcode(qrCodeRegionId);
          html5QrCode
            .start(
              { facingMode: 'environment' },
              {
                fps: 10, // Optional, frame per seconds for qr code scanning
                qrbox: { width: 250, height: 250 }, // Optional, if you want bounded box UI
              },
              async (decodedText, decodedResult) => {
                if (ethers.isAddress(decodedText)) {
                  editorText = decodedText;
                  if (input) {
                    input.value = decodedText;
                  }
                  address = decodedText;
                  await html5QrCode.stop();
                  // html5QrCode.clear();
                  isScanning = false;
                } else {
                  alert('Scanned code is not a valid Ethereum address.');
                }
              },
              (errorMessage) => {
                // alert(errorMessage);
              }
            )
            .catch((err) => {
              console.error('Error starting QR Code scanner:', err);
              alert(err);
            });
        }
      })
      .catch((err) => {
        console.error('Error starting QR Code scanner:', err);
      });
  }
</script>

<div class="flex item-center w-full gap-x-2">
  <input
    bind:this={input}
    type="text"
    class="input input-bordered bg-gray-100 flex-1"
    placeholder="Enter or scan Ethereum address"
    oninput={handleInput}
    onpaste={handleInput}
    oncut={handleInput}
  />
  <button onclick={openQrScanner} class="btn btn-square md:hidden">
    <img src="/qr-code.svg" alt="QR Code" class="w-6" />
  </button>
  <!-- <div id="qr-scanner" style={{ width: "300px", margin: "20px auto" }}></div> -->
</div>

{#if isScanning}
  <div class="fixed top-0 left-0 w-screen h-screen z-100">
    <div id="qr-scanner" class="w-[300px] my-5 mx-auto"></div>
  </div>
{/if}
