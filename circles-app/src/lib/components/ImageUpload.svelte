<script lang="ts">
	// Props - interface for parent components
	interface Props {
		imageDataUrls?: string[];
		onnewimage?: (dataUrl: string) => void;
		onremoveimage?: (index: number) => void;
		onclearall?: () => void;
		cropWidth?: number;
		cropHeight?: number;
	}
	
	let { imageDataUrls = [], onnewimage, onremoveimage, onclearall, cropWidth = 256, cropHeight = 256 }: Props = $props();

	let imageFiles: File[] = [];
	let fileUpload: HTMLInputElement | undefined;

	// Effect to handle external URLs when imageDataUrls changes
	$effect(() => {
		const allUrls = imageDataUrls || [];
		for (const url of allUrls) {
			if (url.startsWith('http')) {
				getImageAsDataUrl(url);
			}
		}
	});

	async function getImageAsDataUrl(imageUrl: string) {
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const file = new File([blob], 'image.jpg', { type: blob.type });
			createImagePreview(file);
		} catch (error) {
			console.error('Failed to fetch external image:', error);
		}
	}

	function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			for (let i = 0; i < target.files.length; i++) {
				imageFiles.push(target.files[i]);
				createImagePreview(target.files[i]);
			}
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		if (
			event.dataTransfer &&
			event.dataTransfer.files &&
			event.dataTransfer.files.length > 0
		) {
			for (let i = 0; i < event.dataTransfer.files.length; i++) {
				imageFiles.push(event.dataTransfer.files[i]);
				createImagePreview(event.dataTransfer.files[i]);
			}
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
					const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

					if (dataUrl.length > 150 * 1024) {
						console.warn("Image size exceeds 150 KB");
					}
					
					// Add to the array of image URLs
					imageDataUrls = [...imageDataUrls, dataUrl];
          onnewimage?.(dataUrl);
				}
			};
		};
		reader.readAsDataURL(file);
	}

	function removeImage(index: number) {
		imageFiles.splice(index, 1);
		const newImages = imageDataUrls.filter((_, i) => i !== index);
    imageDataUrls = newImages;
    onremoveimage?.(index);
	}

	function clearAllImages() {
		imageFiles = [];
		imageDataUrls = [];
    onclearall?.();
	}

	function openFilePicker() {
		if (fileUpload) {
			fileUpload.click();
		}
	}
</script>

<div class="space-y-4">
  <button
    type="button"
    class="w-full flex-col items-center border border-dashed border-gray-300 rounded-lg px-6 py-10 bg-50 hover:bg-100 transition-colors"
    onclick={openFilePicker}
    ondragover={handleDragOver}
    ondrop={handleDrop}
  >
    <input
      bind:this={fileUpload}
      type="file"
      id="imageUpload"
      accept="image/*"
      multiple
      onchange={handleFileInput}
      class="hidden"
    />
    <p class="text-gray-500">Drag and drop images here or click to select</p>
  </button>

  {#if imageDataUrls.length > 0}
    <div class="flex justify-between items-center mb-2">
      <span class="text-sm text-gray-600">{imageDataUrls.length} image(s) uploaded</span>
      <button
        type="button"
        class="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-200 transition-colors sm:text-xs"
        onclick={clearAllImages}
      >
        Clear All
      </button>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      {#each imageDataUrls as url, index (index)}
        <div class="relative group">
          <img
            src={url}
            alt={`Preview ${index + 1}`}
            class="w-full h-32 object-cover rounded-lg"
          />
          <button
            type="button"
            class="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onclick={() => removeImage(index)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
