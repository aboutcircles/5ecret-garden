<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { ProfilePopup } from '$lib/areas/profile/ui/pages';
  import { popupControls } from '$lib/shared/state/popup';
  import type { TrustRow as TrustRowType } from '$lib/areas/settings/model/gatewayTypes';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';

  type TrustRowItem = TrustRowType & {
    showRemove?: boolean;
    onRemove?: () => void;
  };

  interface Props {
    item: TrustRowItem;
  }

  let { item }: Props = $props();

  const expiryLabel = $derived.by(() =>
    item.expiry ? new Date(Number(item.expiry) * 1000).toLocaleString() : ''
  );

  function openProfile(): void {
    popupControls.open?.({ component: ProfilePopup, props: { address: item.trustReceiver } });
  }

  function focusSearchInput(anchor?: HTMLElement | null): void {
    const scope = anchor?.closest<HTMLElement>('[data-gateway-trust-list-scope]')
      ?? document.querySelector<HTMLElement>('[data-gateway-trust-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-gateway-trust-search-input]')
      ?? document.querySelector<HTMLInputElement>('[data-gateway-trust-search-input]');
    input?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: (anchor) => {
      const scope = anchor?.closest<HTMLElement>('[data-gateway-trust-list-scope]')
        ?? document.querySelector<HTMLElement>('[data-gateway-trust-list-scope]');
      return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-gateway-trust-row]'));
    },
    focusInput: focusSearchInput,
    onActivateRow: () => openProfile(),
  });

  function onRowKeydown(event: KeyboardEvent): void {
    listNavigator.onRowKeydown(event);
  }

  function onRowClick(event: MouseEvent): void {
    listNavigator.onRowClick(event);
    openProfile();
  }

</script>

<div
  data-gateway-trust-row
  tabindex={0}
  role="button"
  aria-label={`Open trusted account ${item.trustReceiver}`}
  class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <RowFrame clickable={false} dense={true} noLeading={true}>
    <div class="w-full flex items-center justify-between gap-3">
      <div class="min-w-0 flex items-center gap-2">
        <Avatar
          address={item.trustReceiver}
          view="horizontal"
          clickable={true}
          bottomInfo={expiryLabel}
          showTypeInfo={true}
        />
      </div>

      <div class="flex items-center gap-2 text-right shrink-0">
        {#if item.showRemove}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square text-error/80 hover:text-error"
            aria-label="Remove trust"
            onclick={(event) => {
              event.stopPropagation();
              item.onRemove?.();
            }}
          >
            <img src="/trash.svg" alt="" class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        {/if}
      </div>
    </div>
  </RowFrame>
</div>
