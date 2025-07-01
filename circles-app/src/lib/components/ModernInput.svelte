<script lang="ts">
  interface Props {
    label: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    type?: 'text' | 'email' | 'password' | 'number';
    disabled?: boolean;
    error?: string;
    helperText?: string;
  }

  let {
    label,
    value = $bindable(''),
    placeholder = '',
    required = false,
    type = 'text',
    disabled = false,
    error,
    helperText
  }: Props = $props();
</script>

<!-- Text Input Component matching CSS specifications -->
<div class="flex flex-col gap-1 w-full">
  <!-- Label -->
  <div class="flex items-center gap-0.5">
    <label class="text-sm font-medium text-circles-text">
      {label}
    </label>
    {#if required}
      <span class="text-sm font-semibold text-gray-900">*</span>
    {/if}
  </div>

  <!-- Input Field -->
  <div class="relative">
    <input
      {type}
      {placeholder}
      {disabled}
      bind:value
      class="
        w-full h-11 px-3 py-3
        bg-white
        border border-circles-border
        rounded-circles-input
        text-base text-circles-text
        placeholder:text-circles-text-light
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        disabled:bg-gray-50 disabled:text-gray-500
        {error ? 'border-error focus:border-error focus:ring-error/20' : ''}
      "
    />
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
