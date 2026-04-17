<script lang="ts">
  import {
    fileToCroppedDataUrl,
    fileToFittedDataUrl,
    MEDIA_MAX_BYTES,
  } from '$lib/shared/media/imageTools';

  interface Props {
    imageDataUrls: string[];
    cropWidth?: number;
    cropHeight?: number;
    cropMime?: string;
    cropQuality?: number;
    fitMime?: string;
    fitQuality?: number;
    maxBytes?: number;
    readonly?: boolean;
    onnewimage?: (dataUrl: string) => void;
    onremoveimage?: (index: number) => void;
    onclearall?: () => void;
    mode?: 'crop' | 'fit';
  }

  let {
    imageDataUrls,
    cropWidth = 512,
    cropHeight = 512,
    cropMime = 'image/jpeg',
    cropQuality = 0.9,
    fitMime = 'image/jpeg',
    fitQuality = 0.9,
    maxBytes = MEDIA_MAX_BYTES,
    readonly = false,
    onnewimage,
    onremoveimage,
    onclearall,
    mode = 'crop',
  }: Props = $props();

  let dragging = $state(false);

  async function processFile(file: File): Promise<void> {
    if (readonly) return;
    try {
      let dataUrl: string;
      if (mode === 'crop') {
        const res = await fileToCroppedDataUrl(file, {
          width: cropWidth,
          height: cropHeight,
          mime: cropMime,
          quality: cropQuality,
          maxBytes,
        });
        dataUrl = res.dataUrl;
      } else {
        const res = await fileToFittedDataUrl(file, {
          maxWidth: cropWidth,
          maxHeight: cropHeight,
          mime: fitMime,
          quality: fitQuality,
          maxBytes,
        });
        dataUrl = res.dataUrl;
      }

      if (typeof onnewimage === 'function') {
        onnewimage(dataUrl);
      }
    } catch (e) {
      console.error('[ImageUpload] failed to process file:', e);
    }
  }

  function handleFileInput(event: Event): void {
    if (readonly) return;
    const input = event.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      void processFile(files[i]);
    }

    if (input) {
      input.value = '';
    }
  }

  function handleDragOver(event: DragEvent): void {
    if (readonly) return;
    event.preventDefault();
    event.stopPropagation();
    dragging = true;
  }

  function handleDragLeave(event: DragEvent): void {
    if (readonly) return;
    event.preventDefault();
    event.stopPropagation();
    dragging = false;
  }

  function handleDrop(event: DragEvent): void {
    if (readonly) return;
    event.preventDefault();
    event.stopPropagation();
    dragging = false;

    const dt = event.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;

    for (let i = 0; i < dt.files.length; i++) {
      void processFile(dt.files[i]);
    }
  }

  function removeAt(idx: number): void {
    if (readonly) return;
    if (typeof onremoveimage === 'function') {
      onremoveimage(idx);
    }
  }

  function clearAll(): void {
    if (readonly) return;
    if (typeof onclearall === 'function') {
      onclearall();
    }
  }
</script>

<div class="space-y-2">
  <!-- Native <label> wrapping a hidden <input type="file"> — the browser opens
       the file picker on click without any JS .click() call, which avoids
       Svelte 5 event delegation + user-activation issues in popups. -->
  <label
    class="border border-dashed rounded-md p-3 text-xs flex flex-col gap-2 cursor-pointer"
    class:border-primary={dragging}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <input
      type="file"
      accept="image/*"
      multiple
      class="sr-only"
      disabled={readonly}
      onchange={handleFileInput}
    />
    <div class="flex items-center justify-between gap-2">
      <span class="font-semibold">Upload images</span>
      <span class="opacity-60">
        JPEG/PNG, up to {Math.round(maxBytes / (1024 * 1024))} MiB each
      </span>
    </div>
    <div class="opacity-70">
      Click to select files or drag &amp; drop them here. Images are cropped to
      {cropWidth}×{cropHeight}px.
    </div>
  </label>

  {#if imageDataUrls?.length}
    <div class="flex justify-between items-center mt-1 text-xs">
      <span class="opacity-70">
        {imageDataUrls.length} image{imageDataUrls.length === 1 ? '' : 's'}
      </span>
      {#if !readonly}
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          onclick={clearAll}
        >
          Clear all
        </button>
      {/if}
    </div>

    <div class="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
      {#each imageDataUrls as url, idx}
        <div class="relative group rounded-md overflow-hidden border border-base-300">
          <img
            src={url}
            alt={`image-${idx}`}
            class="w-full h-24 object-cover"
            loading="lazy"
          />
          {#if !readonly}
            <button
              type="button"
              class="absolute top-1 right-1 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity"
              onclick={(e) => {removeAt(idx); e.stopPropagation();}}
            >
              ✕
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
