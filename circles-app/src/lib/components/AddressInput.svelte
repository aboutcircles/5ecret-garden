<!-- AddressInput.svelte -->
<script lang="ts">
  import { ethers } from 'ethers6';
  import { Html5Qrcode } from 'html5-qrcode';
  import { createEventDispatcher, onMount } from 'svelte';

  export let address: string | undefined = undefined;

  let input: HTMLInputElement;
  let editorText: string | undefined = undefined;
  let isScanning = false;

  const eventDispatcher = createEventDispatcher();
  const qrCodeRegionId = 'qr-scanner';

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

  async function openQrScanner() {
    console.log('openQrScanner');
    isScanning = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        console.log('devices', devices);
        /**
         * devices would be an array of objects of type:
         * { id: "id", label: "label" }
         */
        if (devices && devices.length) {
          const cameraId = devices[0].id;

          console.log('cameraId', cameraId);

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
                console.log('decodedText', decodedText);
                if (ethers.isAddress(decodedText)) {
                  editorText = decodedText;
                  input.value = decodedText;
                  address = decodedText;
                  await html5QrCode.stop();
                  eventDispatcher('addressChange', { address });
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
    on:input={handleInput}
    on:paste={handleInput}
    on:cut={handleInput}
  />
  <button on:click={openQrScanner} class="btn btn-square md:hidden">
    <img src="/qr-code.svg" alt="QR Code" class="w-6" />
  </button>
  <!-- <div id="qr-scanner" style={{ width: "300px", margin: "20px auto" }}></div> -->
</div>

{#if isScanning}
  <div class="fixed top-0 left-0 w-screen h-screen z-100">
    <div id="qr-scanner" class="w-[300px] my-5 mx-auto"></div>
  </div>
{/if}
