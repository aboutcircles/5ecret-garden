<script lang="ts">
    import { T } from '$lib/design-system/tokens.js';

    interface Props {
        images: string[];
    }

    let { images }: Props = $props();

    let currentIndex: number = $state(0);
    const originalIndex: number = 0;

    const imageUrls = $derived(Array.isArray(images) ? images : []);

    function selectImage(index: number): void {
        currentIndex = index;
    }

    function prevImage(): void {
        if (imageUrls.length <= 1) return;
        currentIndex = currentIndex > 0 ? currentIndex - 1 : imageUrls.length - 1;
    }

    function nextImage(): void {
        if (imageUrls.length <= 1) return;
        currentIndex = currentIndex < imageUrls.length - 1 ? currentIndex + 1 : 0;
    }

    function resetToOriginal(): void {
        currentIndex = originalIndex;
    }
</script>

{#if imageUrls.length > 0}
    <div>
        <!-- Main Image Display -->
        <div class="pg-group" style="position:relative;" role="button" tabindex="0" onclick={nextImage} onkeydown={(e) => { const k=e.key; if (k==='Enter' || k===' ') { e.preventDefault(); nextImage(); }}} >
            <img
                src={imageUrls[currentIndex]}
                alt={`Product image ${currentIndex + 1}`}
                style="width:100%;height:256px;object-fit:cover;border-radius:8px;cursor:pointer;display:block;"
            />

            <!-- Navigation Arrows -->
            {#if imageUrls.length > 1}
                <button
                    onclick={(e) => {prevImage(); e.stopPropagation();}}
                    class="pg-nav-btn"
                    style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;padding:8px;border-radius:9999px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;"
                    aria-label="Previous image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>

                <button
                    onclick={(e) => {nextImage(); e.stopPropagation();}}
                    class="pg-nav-btn"
                    style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;padding:8px;border-radius:9999px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;"
                    aria-label="Next image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
            {/if}

            <!-- Image Counter -->
            <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.5);color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">
                {currentIndex + 1} / {imageUrls.length}
            </div>
        </div>

        <!-- Thumbnail Strip -->
        {#if imageUrls.length > 1}
            <div style="display:flex;gap:8px;margin-top:16px;overflow-x:auto;padding-bottom:8px;">
                {#each imageUrls as url, index}
                    <button
                        onclick={() => selectImage(index)}
                        style="flex-shrink:0;width:64px;height:64px;border-radius:8px;overflow:hidden;border:2px solid {currentIndex === index ? T.primary : T.hairlineSoft};cursor:pointer;padding:0;transition:border-color 0.2s ease-out,transform 0.2s ease-out;transform:{currentIndex === index ? 'scale(1.05)' : 'scale(1)'};"
                        aria-label={`View image ${index + 1}`}
                    >
                        <img
                            src={url}
                            alt={`Thumbnail ${index + 1}`}
                            style="width:100%;height:100%;object-fit:cover;display:block;"
                        />
                    </button>
                {/each}

                {#if currentIndex !== originalIndex}
                    <button
                        onclick={resetToOriginal}
                        style="flex-shrink:0;width:64px;height:64px;border-radius:8px;border:2px solid {T.hairlineSoft};display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent;"
                        aria-label="Reset to original image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" style="width:24px;height:24px;color:{T.inkMuted};" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                {/if}
            </div>
        {/if}
    </div>
{:else}
    <div style="background:{T.pageDeep};border:1px solid {T.hairlineSoft};border-radius:8px;padding:32px;text-align:center;">
        <svg xmlns="http://www.w3.org/2000/svg" style="width:48px;height:48px;margin:0 auto 8px;color:{T.inkFaint};display:block;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p style="font-size:13px;color:{T.inkMuted};">No images available</p>
    </div>
{/if}

<style>
  .pg-group .pg-nav-btn { opacity: 0; transition: opacity 0.2s ease-out; }
  .pg-group:hover .pg-nav-btn { opacity: 1; }
</style>
