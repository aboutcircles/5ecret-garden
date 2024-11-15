<!-- AddressInput.svelte -->
<script lang="ts">
  import { ethers } from 'ethers6';
  import { Html5QrcodeScanner } from 'html5-qrcode';
  import { Html5Qrcode } from "html5-qrcode";
  import { MultiFormatReader, BarcodeFormat } from '@zxing/library';
  import { createEventDispatcher, onMount } from 'svelte';

  export let address: string | undefined = undefined;

  let input: HTMLInputElement;
  let editorText: string | undefined = undefined;
  let isScanning = false;

  const eventDispatcher = createEventDispatcher();
  const qrCodeRegionId = "qr-scanner";

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

    Html5Qrcode.getCameras().then(devices => {
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
        html5QrCode.start(
          { facingMode: "environment" }, 
          {
            fps: 10,    // Optional, frame per seconds for qr code scanning
            qrbox: { width: 250, height: 250 }  // Optional, if you want bounded box UI
          },
          async(decodedText, decodedResult) => {
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
          })
        .catch((err) => {
          console.error('Error starting QR Code scanner:', err);
          alert(err);
        });
      }
    }).catch(err => {
      console.error('Error starting QR Code scanner:', err);
    });

    // navigator.mediaDevices.enumerateDevices()
    //   .then((devices) => {
    //     console.log('devices', devices);
    //       const videoDevices = devices.filter(device => device.kind === "videoinput");
    //       if (videoDevices.length > 0) {
    //         // console.log("Available cameras:", videoDevices);

    //         // // Example: Log the camera IDs
    //         // videoDevices.forEach((device, index) => {
    //         //     console.log(`Camera ${index}: ${device.label}, ID: ${device.deviceId}`);
    //         // });

    //         // Use the first camera by default
    //         const cameraId = videoDevices[0].deviceId;

    //         console.log('cameraId', cameraId);

    //         if (cameraId) {

    //         // Initialize html5-qrcode with the camera ID
    //           const html5QrCode = new Html5Qrcode(qrCodeRegionId);
    //           html5QrCode.start(
    //               cameraId, // Pass the camera ID here
    //               { fps: 10, qrbox: 250 },
    //               (decodedText, decodedResult) => {
    //                   console.log(`QR Code detected: ${decodedText}`);
    //               },
    //               (errorMessage) => {
    //                   console.warn(`QR Code scan error: ${errorMessage}`);
    //               }
    //           ).catch(err => {
    //               console.error("Error starting QR Code scanner:", err);
    //           });
    //         } else {
    //           console.error("No camera found!");
    //         }
    //     } else {
    //   //     try {
    //   // const html5QrCode = new Html5Qrcode(qrCodeRegionId);
    //   // await html5QrCode.start(
    //   //   { facingMode: "environment" },
    //   //   {
    //   //     fps: 10,
    //   //     qrbox: { width: 250, height: 250 },
    //   //   },
    //   //   (decodedText) => {
    //   //     console.log('decodedText', decodedText);
    //   //     // setScanResult(decodedText);
    //   //     html5QrCode.stop()
    //   //       .then(() => {
    //   //         html5QrCode.clear();
    //   //         isScanning = false;
    //   //       })
    //   //       .catch((err) => console.error("Stop failed:", err));

    //   //     // if (ethers.isAddress(decodedText)) {
    //   //     //   editorText = decodedText;
    //   //     //   input.value = decodedText;
    //   //     //   address = decodedText;
    //   //     //   eventDispatcher('addressChange', { address });
    //   //     //   html5QrCode.clear();
    //   //     //   isScanning = false;
    //   //     // } else {
    //   //     //   alert('Scanned code is not a valid Ethereum address.');
    //   //     // }
    //   //   },
    //   //   (errorMessage) => {
    //   //     console.error("QR Code scanning failed:", errorMessage);
    //   //   }
    //   // );

    // // } catch (error) {
    // //   console.error("QR Code scanning failed:", error);
    // // }
    //     }
    // })
    // .catch((err) => {
    //     console.error("Error enumerating devices:", err);
    // });


    // const qrCodeRegionId = "qr-scanner";

    // try {
    //   const html5QrCode = new Html5Qrcode(qrCodeRegionId);
    //   console.log('html5QrCode', html5QrCode);
    // } catch (error) {
    //   console.error("111 QR Code scanning failed:", error);
    // }

    // try {
    //   const html5QrCode = new Html5Qrcode(qrCodeRegionId);
    //   await html5QrCode.start(
    //     { facingMode: "environment" },
    //     {
    //       fps: 10,
    //       qrbox: { width: 250, height: 250 },
    //     },
    //     (decodedText) => {
    //       console.log('decodedText', decodedText);
    //       // setScanResult(decodedText);
    //       html5QrCode.stop()
    //         .then(() => {
    //           html5QrCode.clear();
    //           isScanning = false;
    //         })
    //         .catch((err) => console.error("Stop failed:", err));

    //       // if (ethers.isAddress(decodedText)) {
    //       //   editorText = decodedText;
    //       //   input.value = decodedText;
    //       //   address = decodedText;
    //       //   eventDispatcher('addressChange', { address });
    //       //   html5QrCode.clear();
    //       //   isScanning = false;
    //       // } else {
    //       //   alert('Scanned code is not a valid Ethereum address.');
    //       // }
    //     },
    //     (errorMessage) => {
    //       console.error("QR Code scanning failed:", errorMessage);
    //     }
    //   );

    // } catch (error) {
    //   console.error("QR Code scanning failed:", error);
    // }

    // const qrCodeScanner = new Html5QrcodeScanner(
    //   qrCodeRegionId,
    //   { fps: 10, qrbox: 250 },
    //   false
    // );

    // qrCodeScanner.render(
    //   (decodedText) => {
        // if (ethers.isAddress(decodedText)) {
        //   editorText = decodedText;
        //   input.value = decodedText;
        //   address = decodedText;
        //   eventDispatcher('addressChange', { address });
        //   qrCodeScanner.clear();
        //   isScanning = false;
        // } else {
        //   alert('Scanned code is not a valid Ethereum address.');
        // }
    //   },
    //   (errorMessage) => {
    //     console.error(errorMessage);
    //   }
    // );


  
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
    <div id="qr-scanner" style={{ width: "300px", margin: "20px auto" }}></div> 
  </div>
{/if}
