<script lang="ts">
  interface Props {
    label: string;
    accept?: string;
    value?: File | null;
    previewUrl?: string;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    onFileSelect?: (file: File | null) => void;
    onClear?: () => void;
  }

  let {
    label,
    accept = 'image/*',
    value = $bindable(null),
    previewUrl = $bindable(''),
    disabled = false,
    error,
    helperText,
    onFileSelect,
    onClear
  }: Props = $props();

  let fileInput: HTMLInputElement;

  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] || null;
    
    value = file;
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      previewUrl = '';
    }
    
    onFileSelect?.(file);
  };

  const handleClear = () => {
    value = null;
    previewUrl = '';
    if (fileInput) {
      fileInput.value = '';
    }
    onClear?.();
  };
</script>

<!-- File Upload Component matching CSS specifications -->
<div class="flex flex-col gap-1 w-full">
  <!-- Label -->
  <div class="text-sm font-medium text-circles-text">
    {label}
  </div>

  <!-- Upload Area -->
  <div class="
    border border-circles-border
    rounded-circles-input
    p-4
    {disabled ? 'bg-gray-50' : 'bg-white'}
  ">
    <div class="flex items-center gap-6">
      <!-- Preview Area -->
      <div class="flex-shrink-0">
        {#if previewUrl}
          <div class="relative">
            <div class="w-25 h-25 rounded-2xl bg-circles-card overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Preview" 
                class="w-full h-full object-cover"
              />
            </div>
          </div>
        {:else}
          <div class="w-25 h-25 rounded-full bg-circles-card flex items-center justify-center">
            <svg class="w-8 h-8 text-circles-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        {/if}
      </div>

      <!-- Upload Controls -->
      <div class="flex-1 flex flex-col gap-2">
        {#if previewUrl}
          <button
            type="button"
            onclick={handleClear}
            class="
              inline-flex items-center justify-center
              px-3 py-1.5
              text-sm font-medium
              bg-circles-danger-bg text-circles-danger
              rounded-circles-input
              hover:bg-red-100
              transition-colors duration-200
              self-start
            "
            {disabled}
          >
            Clear Image
          </button>
        {:else}
          <input
            bind:this={fileInput}
            type="file"
            {accept}
            {disabled}
            onchange={handleFileChange}
            class="hidden"
          />
          <button
            type="button"
            onclick={() => fileInput?.click()}
            class="
              inline-flex items-center justify-center
              px-3 py-1.5
              text-sm font-medium
              bg-gray-100 text-gray-700
              rounded-circles-input
              hover:bg-gray-200
              transition-colors duration-200
              self-start
            "
            {disabled}
          >
            Choose File
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Helper Text / Error -->
  {#if error}
    <div class="text-sm text-error">
      {error}
    </div>
  {:else if helperText}
    <div class="text-sm text-circles-text-muted">
      {helperText}
    </div>
  {/if}
</div>
