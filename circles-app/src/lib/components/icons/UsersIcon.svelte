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
    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197a4 4 0 11-6.518-3.046A5.984 5.984 0 0015 21z"
  />
</svg>
