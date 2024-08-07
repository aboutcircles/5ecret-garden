<script lang="ts">
    import {createEventDispatcher} from 'svelte';

    export let cropWidth: number = 256;
    export let cropHeight: number = 256;
    export let imageDataUrl: string | undefined;

    const dispatch = createEventDispatcher();

    let imageFile: File | null = null;
    let fileUpload: HTMLInputElement;

    function handleFileInput(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            imageFile = target.files[0];
            createImagePreview(imageFile);
        }
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
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
                        console.warn("Image size exceeds 150 KB after compression");
                    }

                    dispatch('newImage', {dataUrl: imageDataUrl});
                }
            };
        };
        reader.readAsDataURL(file);
    }

    function clearImage() {
        imageFile = null;
        imageDataUrl = "";
        dispatch('cleared');
    }

    function openFilePicker() {
        fileUpload.click();
    }

</script>

<div class="flex flex-col items-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50"
     on:click={openFilePicker}
     on:dragover={handleDragOver}
     on:drop={handleDrop}>
    <input bind:this={fileUpload} type="file" id="imageUpload" accept="image/*" on:change={handleFileInput}
           class="hidden"/>
    {#if !imageDataUrl}
        <p>
            Drag and drop an image here or click to select.
        </p>
    {:else}
        <img src={imageDataUrl} alt="Image preview" class="mt-4 max-w-full rounded-lg shadow-md"/>
        <button type="button"
                class="mt-2 px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                on:click={clearImage}>Clear Image
        </button>
    {/if}
</div>
