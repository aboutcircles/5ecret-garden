<script lang="ts">
  import { notifications, dismiss, type Notification, type NotificationLevel } from '$lib/shared/state/notifications.svelte';

  /**
   * Get the appropriate CSS classes for each notification level
   * Uses explicit text colors for proper contrast on colored backgrounds
   */
  function getLevelClasses(level: NotificationLevel): string {
    const baseClasses = 'alert shadow-lg';
    const levelClasses: Record<NotificationLevel, string> = {
      info: 'alert-info text-info-content',
      success: 'alert-success text-success-content',
      warning: 'alert-warning text-warning-content',
      error: 'alert-error text-error-content',
    };
    return `${baseClasses} ${levelClasses[level]}`;
  }

  /**
   * Get the icon for each notification level
   */
  function getLevelIcon(level: NotificationLevel): string {
    const icons: Record<NotificationLevel, string> = {
      info: 'ℹ️',
      success: '✓',
      warning: '⚠️',
      error: '✕',
    };
    return icons[level];
  }
</script>

<!-- Toast container - fixed position in bottom right -->
<div class="toast toast-end toast-bottom z-50">
  {#each notifications as notification (notification.id)}
    <div
      class={getLevelClasses(notification.level)}
      role="alert"
      aria-live="polite"
    >
      <div class="flex {notification.title ? 'items-start' : 'items-center'} gap-3 w-full">
        <!-- Icon -->
        <span class="text-lg flex-shrink-0" aria-hidden="true">
          {getLevelIcon(notification.level)}
        </span>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          {#if notification.title}
            <h3 class="font-semibold text-sm">{notification.title}</h3>
          {/if}
          <p class="text-sm break-words">{notification.message}</p>
        </div>

        <!-- Dismiss button -->
        {#if notification.dismissible}
          <button
            type="button"
            class="btn btn-sm btn-ghost btn-circle flex-shrink-0"
            onclick={() => dismiss(notification.id)}
            aria-label="Dismiss notification"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  /* Ensure toasts have a max width and proper stacking */
  .toast {
    max-width: 400px;
    gap: 0.5rem;
  }

  .toast .alert {
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
