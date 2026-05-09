<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import type { TrustRow as TrustRowType } from '$lib/areas/settings/model/gatewayTypes';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { T } from '$lib/design-system/tokens.js';

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
    openProfilePopup(item.trustReceiver);
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
  style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;transition:box-shadow 0.15s;"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <div style="min-width:0;flex:1;">
    <Avatar
      address={item.trustReceiver}
      view="horizontal"
      clickable={true}
      bottomInfo={expiryLabel}
      showTypeInfo={true}
    />
  </div>

  {#if item.showRemove}
    <button
      type="button"
      style="flex-shrink:0;width:28px;height:28px;border-radius:9999px;border:1px solid rgba(196,68,48,0.2);background:{T.negativeSoft};color:{T.negative};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
      aria-label="Remove trust"
      onclick={(event) => {
        event.stopPropagation();
        item.onRemove?.();
      }}
    >
      <img src="/trash.svg" alt="" style="width:13px;height:13px;" aria-hidden="true" />
    </button>
  {/if}
</div>
