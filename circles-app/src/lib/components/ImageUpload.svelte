<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    cropWidth?: number;
    cropHeight?: number;
    imageDataUrl: string | undefined;
    onnewimage: (dataUrl: string) => void;
    oncleared: () => void;
  }

  let {
    cropWidth = 256,
    cropHeight = 256,
    imageDataUrl = $bindable(),
    onnewimage,
    oncleared,
  }: Props = $props();

  let imageFile: File | null = null;
  let fileUpload: HTMLInputElement | undefined = $state();

  async function getImageAsDataUrl(imageUrl: string) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], 'image.jpg', { type: blob.type });
    createImagePreview(file);
  }

  function handleFileInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      imageFile = target.files[0];
      createImagePreview(imageFile);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (
      event.dataTransfer &&
      event.dataTransfer.files &&
      event.dataTransfer.files[0]
    ) {
      imageFile = event.dataTransfer.files[0];
      createImagePreview(event.dataTransfer.files[0]);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function createImagePreview(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          ctx.drawImage(img, 0, 0, cropWidth, cropHeight);
          imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          if (imageDataUrl.length > 150 * 1024) {
            console.warn('Image size exceeds 150 KB after compression');
          }
          onnewimage(imageDataUrl);
        }
      };
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    imageFile = null;
    imageDataUrl = '';
    oncleared();
  }

  function openFilePicker() {
    if (fileUpload) {
      fileUpload.click();
    }
  }

  $effect(() => {
    if (imageDataUrl?.startsWith('http')) {
      getImageAsDataUrl(imageDataUrl);
    }
  });
</script>

<button
  class="w-full flex flex-col items-center border border-dashed border-gray-300 rounded-lg px-6 py-10 bg-gray-50"
  onclick={openFilePicker}
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  <input
    bind:this={fileUpload}
    type="file"
    id="imageUpload"
    accept="image/*"
    onchange={handleFileInput}
    class="hidden"
  />
  {#if !imageDataUrl}
    <p>Drag and drop an image here or click to select.</p>
  {:else}
    <img
      src={imageDataUrl}
      alt="Preview"
      class="mt-4 max-w-full rounded-lg shadow-sm"
    />
  {/if}
</button>
{#if imageDataUrl}
  <button
    type="button"
    class="mt-2 px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    onclick={clearImage}
    >Clear Image
  </button>
{/if}