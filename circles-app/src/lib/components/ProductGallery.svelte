<script lang="ts">
    interface Props {
        images: string[];
    }

    let { images }: Props = $props();

    // State for current image index
    let currentIndex: number = $state(0);
    const originalIndex: number = 0; // Always remember the first image
    
    const imageUrls = $derived(Array.isArray(images) ? images : []);
    
    // Handle image selection
    function selectImage(index: number): void {
        currentIndex = index;
    }
    
    // Navigate to previous image
    function prevImage(): void {
        if (imageUrls.length <= 1) return;
        currentIndex = currentIndex > 0 ? currentIndex - 1 : imageUrls.length - 1;
    }
    
    // Navigate to next image
    function nextImage(): void {
        if (imageUrls.length <= 1) return;
        currentIndex = currentIndex < imageUrls.length - 1 ? currentIndex + 1 : 0;
    }
    
    // Reset to original first image
    function resetToOriginal(): void {
        currentIndex = originalIndex;
    }
</script>

{#if imageUrls.length > 0}
    <div class="image-gallery">
        <!-- Main Image Display -->
        <div class="relative group" role="button" tabindex="0" onclick={nextImage} onkeydown={(e) => { const k=e.key; if (k==='Enter' || k===' ') { e.preventDefault(); nextImage(); }}} >
            <img 
                src={imageUrls[currentIndex]}
                alt={`Product image ${currentIndex + 1}`}
                class="w-full h-64 md:h-96 object-cover rounded-lg cursor-pointer transition-opacity duration-200"
            />
            
            <!-- Navigation Arrows -->
            {#if imageUrls.length > 1}
                <button
                    onclick={(e) => {prevImage(); e.stopPropagation();}}
                    class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
                    aria-label="Previous image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
                
                <button
                    onclick={(e) => {nextImage(); e.stopPropagation();}}
                    class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
                    aria-label="Next image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                </button>
            {/if}
            
            <!-- Image Counter -->
            <div class="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {currentIndex + 1} / {imageUrls.length}
            </div>
        </div>
        
        <!-- Thumbnail Strip -->
        {#if imageUrls.length > 1}
            <div class="flex gap-2 mt-4 overflow-x-auto pb-2">
                {#each imageUrls as url, index}
                    <button
                        onclick={() => selectImage(index)}
                        class={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            currentIndex === index 
                                ? 'border-primary scale-105' 
                                : 'border-base-300 hover:border-primary/50'
                        }`}
                        aria-label={`View image ${index + 1}`}
                    >
                        <img
                            src={url}
                            alt={`Thumbnail ${index + 1}`}
                            class="w-full h-full object-cover"
                        />
                    </button>
                {/each}
                
                <!-- Reset to Original Button (only show if not on first image) -->
                {#if currentIndex !== originalIndex}
                    <button
                        onclick={resetToOriginal}
                        class="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 border-base-300 flex items-center justify-center hover:border-primary/50 transition-all duration-200"
                        aria-label="Reset to original image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-base-content/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                {/if}
            </div>
        {:else}
            <!-- Single Image - Show reset button anyway -->
            <div class="flex gap-2 mt-4">
                <button
                    onclick={resetToOriginal}
                    class="px-3 py-1 text-xs bg-base-200 hover:bg-base-300 rounded-lg transition-colors duration-200"
                    aria-label="Reset image"
                >
                    Reset Image
                </button>
            </div>
        {/if}
    </div>
{:else}
    <div class="bg-base-200 border border-base-300 rounded-lg p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-sm text-base-content/60">No images available</p>
    </div>
{/if}
