<script lang="ts">
  import {
    fileToCroppedDataUrl,
    fileToFittedDataUrl,
    MEDIA_MAX_BYTES,
  } from '$lib/shared/media/imageTools';
  import { T } from '$lib/design-system/tokens.js';

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

  let fileInput: HTMLInputElement | undefined = $state();
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

  function handleClickSelect(): void {
    if (readonly) return;
    if (!fileInput) return;
    fileInput.value = '';
    fileInput.click();
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

<div style="display:flex;flex-direction:column;gap:8px;">
  <!-- Drop zone -->
  <div
    role="button"
    tabindex="0"
    style="
      border:1.5px dashed {dragging ? T.primary : T.hairline};
      border-radius:12px;
      padding:16px 14px;
      background:{dragging ? T.primaryFaint : T.surfaceAlt};
      display:flex;flex-direction:column;gap:6px;
      cursor:{readonly ? 'default' : 'pointer'};
      transition:border-color 0.15s,background 0.15s;
    "
    onclick={handleClickSelect}
    onkeydown={(e) => {
      const key = e.key;
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        handleClickSelect();
      }
    }}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span style="font-size:12.5px;font-weight:580;color:{T.ink};">Upload image</span>
      <span style="font-size:11px;color:{T.inkMuted};">
        JPEG/PNG · up to {Math.round(maxBytes / (1024 * 1024))} MiB
      </span>
    </div>
    <div style="font-size:11.5px;color:{T.inkSubtle};line-height:1.5;">
      {#if readonly}
        Image upload is disabled.
      {:else}
        Click to select or drag &amp; drop. Cropped to {cropWidth}×{cropHeight}px.
      {/if}
    </div>

    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      style="display:none;"
      multiple
      onchange={handleFileInput}
    />
  </div>

  {#if imageDataUrls?.length}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span style="font-size:11px;color:{T.inkMuted};">
        {imageDataUrls.length} image{imageDataUrls.length === 1 ? '' : 's'}
      </span>
      {#if !readonly}
        <button
          type="button"
          style="height:24px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkMuted};font-size:11px;cursor:pointer;"
          onclick={clearAll}
        >Clear all</button>
      {/if}
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      {#each imageDataUrls as url, idx}
        <div style="position:relative;border-radius:10px;overflow:hidden;border:1px solid {T.hairlineSoft};">
          <img
            src={url}
            alt="upload-{idx}"
            style="width:100%;height:80px;object-fit:cover;display:block;"
            loading="lazy"
          />
          {#if !readonly}
            <button
              type="button"
              style="
                position:absolute;top:4px;right:4px;
                width:20px;height:20px;border-radius:9999px;
                border:0;background:rgba(15,10,30,0.55);
                color:#fff;font-size:10px;line-height:1;
                cursor:pointer;display:inline-flex;align-items:center;justify-content:center;
              "
              onclick={(e) => { removeAt(idx); e.stopPropagation(); }}
              aria-label="Remove image"
            >✕</button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
