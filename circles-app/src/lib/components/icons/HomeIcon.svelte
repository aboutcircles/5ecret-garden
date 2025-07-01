<script lang="ts">
  interface Props {
    class?: string;
    size?: 'sm' | 'md' | 'lg';
  }

  let { class: className = '', size = 'md' }: Props = $props();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
</script>

<svg 
  class={`${sizeClasses[size]} ${className}`}
  fill="none" 
  stroke="currentColor" 
  viewBox="0 0 24 24"
  aria-hidden="true"
>
  <path 
    stroke-linecap="round" 
    stroke-linejoin="round" 
    stroke-width="2" 
    d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"
  />
</svg>
