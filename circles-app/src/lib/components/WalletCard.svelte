<script lang="ts">
  interface Props {
    title: string;
    description: string;
    icon?: string;
    onClick?: () => void;
    disabled?: boolean;
  }

  let {
    title,
    description,
    icon,
    onClick,
    disabled = false
  }: Props = $props();
</script>

<button
  class="card bg-white shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200 cursor-pointer group w-full text-left {disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/20'}"
  onclick={onClick}
  {disabled}
>
  <div class="card-body p-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        {#if icon}
          <div class="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors duration-200">
            <img src={icon} alt={title} class="w-8 h-8" />
          </div>
        {:else}
          <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <span class="text-primary font-semibold text-lg">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        {/if}
        
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900 text-lg mb-1">{title}</h3>
          <p class="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
      
      <div class="ml-4">
        <svg 
          class="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors duration-200" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
</button>
