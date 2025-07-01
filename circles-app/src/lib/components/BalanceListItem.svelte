<script lang="ts">
  interface Props {
    name: string;
    subtitle?: string;
    amount?: string;
    currency?: string;
    avatar?: string;
    address?: string;
    onClick?: () => void;
    showWrapButton?: boolean;
    onWrapClick?: () => void;
    showActions?: boolean;
    actions?: Array<{
      label: string;
      icon?: string;
      onClick: () => void;
    }>;
    variant?: 'contact' | 'balance' | 'default';
  }

  let {
    name,
    subtitle,
    amount,
    currency = 'CRC',
    avatar,
    address,
    onClick,
    showWrapButton = false,
    onWrapClick,
    showActions = false,
    actions = [],
    variant = 'default'
  }: Props = $props();

  // Generate avatar from address if no avatar provided
  const getAvatarFallback = () => {
    if (avatar) return avatar;
    if (address) {
      // Simple avatar generation based on address
      return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
    }
    return null;
  };

  const avatarSrc = getAvatarFallback();
</script>

<div class="flex items-center justify-between py-4 px-3 hover:bg-gray-50 transition-colors duration-200 rounded-lg border border-transparent hover:border-gray-200 hover:shadow-sm">
  <!-- Left: Avatar and Info -->
  <button 
    class="flex items-center space-x-3 flex-1 text-left min-w-0"
    onclick={onClick}
  >
    <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
      {#if avatarSrc}
        <img src={avatarSrc} alt={name} class="w-full h-full object-cover" />
      {:else}
        <div class="w-full h-full bg-primary/20 flex items-center justify-center">
          <span class="text-primary font-semibold text-sm">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      {/if}
    </div>
    
    <div class="flex-1 min-w-0">
      <div class="font-medium text-gray-900 truncate">{name}</div>
      {#if subtitle}
        <div class="text-sm text-gray-500 truncate">{subtitle}</div>
      {/if}
    </div>
  </button>

  <!-- Right: Amount and Actions -->
  <div class="flex items-center space-x-3 ml-4 flex-shrink-0">
    {#if amount}
      <div class="text-right">
        <div class="font-medium text-gray-900">
          {amount} {currency}
        </div>
      </div>
    {/if}
    
    {#if showWrapButton}
      <button
        class="btn btn-xs btn-outline btn-primary"
        onclick={(e) => {
          e.stopPropagation();
          onWrapClick?.();
        }}
      >
        Wrap
      </button>
    {/if}
    
    {#if showActions && actions.length > 0}
      <div class="dropdown dropdown-end">
        <button 
          tabindex="0" 
          class="btn btn-ghost btn-xs btn-circle"
          onclick={(e) => e.stopPropagation()}
        >
          <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border">
          {#each actions as action}
            <li>
              <button 
                class="flex items-center gap-2 text-sm"
                onclick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {#if action.icon}
                  <img src={action.icon} alt={action.label} class="w-4 h-4" />
                {/if}
                {action.label}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {:else if variant === 'contact'}
      <button 
        class="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
        onclick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    {/if}
  </div>
</div>
