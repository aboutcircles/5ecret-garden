<script lang="ts">
  import { getTimeAgo } from '$lib/utils/shared';
  import type { GroupedTransaction } from '$lib/stores/transactionHistory';
  import { getEnrichedProfile } from '$lib/stores/transactionHistory';
  import { notify } from '$lib/stores/notifications.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { Address } from '@aboutcircles/sdk-types';

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  /**
   * Copy address to clipboard with visual feedback
   */
  async function copyAddress(address: string | undefined, event: MouseEvent) {
    event.stopPropagation();
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      // Show toast notification
      const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
      notify('success', `Copied ${shortAddr}`, { duration: 1500 });
    } catch {
      notify('error', 'Failed to copy', { duration: 2000 });
    }
  }

  /**
   * Check if address is zero (mint/burn)
   */
  function isZero(address: string | undefined): boolean {
    return address?.toLowerCase() === ZERO_ADDRESS;
  }

  /**
   * Get display name for an address: profile name or truncated address fallback
   * Returns special labels for zero address (mint/burn indicator)
   */
  function getDisplayName(address: string | undefined, context?: 'from' | 'to'): string {
    if (!address) return '?';
    if (isZero(address)) {
      return context === 'from' ? '⊕ Mint' : '🔥 Burn';
    }
    const profile = getEnrichedProfile(address as Address);
    if (profile?.name) return profile.name;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get short display name (max 12 chars) for path summary
   */
  function getShortName(address: string | undefined): string {
    if (!address) return '?';
    const profile = getEnrichedProfile(address as Address);
    if (profile?.name) {
      return profile.name.length > 12 ? profile.name.slice(0, 10) + '…' : profile.name;
    }
    return `${address.slice(0, 6)}…`;
  }

  /**
   * Get profile image URL if available
   */
  function getProfileImage(address: string | undefined): string | undefined {
    if (!address) return undefined;
    const profile = getEnrichedProfile(address as Address);
    return profile?.previewImageUrl;
  }

  interface Props {
    item: GroupedTransaction;
    /** Transaction hash to highlight (from URL deep-link) */
    highlightTx?: string;
  }
  let { item, highlightTx }: Props = $props();

  // Check if counterparty is zero address (mint/burn)
  const isZeroAddress = $derived(
    item.counterparty?.toLowerCase() === ZERO_ADDRESS
  );

  // Format timestamp - handle various formats from SDK
  function formatTimestamp(ts: number | string): string {
    if (!ts) return 'Unknown';
    let seconds: number;
    if (typeof ts === 'string') {
      // ISO string or numeric string
      const parsed = Date.parse(ts);
      if (isNaN(parsed)) {
        seconds = parseInt(ts, 10);
      } else {
        seconds = Math.floor(parsed / 1000);
      }
    } else {
      // If timestamp is in ms (13+ digits), convert to seconds
      seconds = ts > 1e12 ? Math.floor(ts / 1000) : ts;
    }
    if (!seconds || isNaN(seconds)) return 'Unknown';
    return getTimeAgo(seconds);
  }

  let expanded = $state(false);
  let rowElement: HTMLDivElement | undefined = $state();

  // Check if this transaction should be highlighted
  const isHighlighted = $derived(
    highlightTx?.toLowerCase() === item.transactionHash.toLowerCase()
  );

  // Track if we've already scrolled to this tx (avoid re-scrolling on every render)
  let hasScrolled = $state(false);

  // Auto-scroll and expand when this transaction is highlighted
  // Uses $effect instead of onMount to handle async data loading
  $effect(() => {
    if (isHighlighted && rowElement && !hasScrolled) {
      hasScrolled = true;
      // Auto-expand multi-event transactions when deep-linked
      if (item.eventCount > 1) {
        expanded = true;
      }
      // Delay scroll to ensure list is fully rendered
      requestAnimationFrame(() => {
        setTimeout(() => {
          rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      });
    }
  });

  // Update URL when clicking the row (for sharing)
  function handleRowClick() {
    if (item.eventCount > 1) {
      expanded = !expanded;
    }
    // Update URL with this transaction hash for sharing
    const url = new URL($page.url);
    url.searchParams.set('tx', item.transactionHash);
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  }

  function formatNetCircles(amount: number): string {
    const abs = Math.abs(amount);
    return abs < 0.01 ? '< 0.01' : abs.toFixed(2);
  }

  function openTx() {
    const url = 'https://gnosisscan.io/tx/' + item.transactionHash;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const isSent = $derived(item.netCircles < 0);
  const displayAmount = $derived(
    `${isSent ? '-' : '+'}${formatNetCircles(item.netCircles)}`
  );

  /**
   * Compute path summary for multi-hop transactions
   * Returns array of unique participants in order of appearance
   */
  const pathParticipants = $derived.by(() => {
    if (item.eventCount <= 1) return [];

    const seen = new Set<string>();
    const participants: string[] = [];

    for (const event of item.events) {
      const fromLower = event.from?.toLowerCase();
      const toLower = event.to?.toLowerCase();

      if (fromLower && !seen.has(fromLower) && fromLower !== ZERO_ADDRESS) {
        seen.add(fromLower);
        participants.push(event.from!);
      }
      if (toLower && !seen.has(toLower) && toLower !== ZERO_ADDRESS) {
        seen.add(toLower);
        participants.push(event.to!);
      }
    }

    return participants;
  });

  const hopCount = $derived(item.eventCount > 1 ? item.eventCount - 1 : 0);

  function getBadgeUrl(type: GroupedTransaction['type']): string | null {
    switch (type) {
      case 'mint':
        return '/badge-mint.svg';
      case 'burn':
        return '/badge-burn.svg';
      case 'send':
        return '/badge-sent.svg';
      case 'receive':
        return '/badge-received.svg';
      default:
        return isSent ? '/badge-sent.svg' : '/badge-received.svg';
    }
  }
</script>

<div
  class="w-full {isHighlighted ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 rounded-lg' : ''}"
  bind:this={rowElement}
>
  <!-- Main collapsed row -->
  <RowFrame
    clickable={true}
    dense={true}
    noLeading={true}
    on:click={handleRowClick}
  >
    <div class="w-full flex items-center justify-between">
      <div class="min-w-0 flex items-center gap-2">
        {#if isZeroAddress}
          <!-- Mint/Burn: show label with participant info -->
          {@const firstEvent = item.events[0]}
          {@const participant = item.type === 'mint' ? firstEvent?.to : firstEvent?.from}
          {@const participantName = participant && !isZero(participant) ? getDisplayName(participant) : null}
          <div class="flex items-center gap-3">
            <div class="avatar">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br {item.type === 'mint' ? 'from-success to-success/60' : item.type === 'burn' ? 'from-error to-error/60' : 'from-primary to-secondary'} flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {#if item.type === 'mint'}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  {:else if item.type === 'burn'}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  {:else}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  {/if}
                </svg>
              </div>
            </div>
            <div class="flex flex-col">
              <span class="font-medium">
                {item.type === 'mint' ? 'Minted' : item.type === 'burn' ? 'Burned' : 'System'}
              </span>
              <span class="text-sm text-base-content/60">
                {formatTimestamp(item.timestamp)}
                {#if participantName && item.eventCount === 1}
                  <span class="text-base-content/40"> · {item.type === 'mint' ? 'to' : 'from'} {participantName}</span>
                {/if}
              </span>
            </div>
          </div>
        {:else}
          <Avatar
            address={item.counterparty}
            view="horizontal"
            clickable={true}
            pictureOverlayUrl={getBadgeUrl(item.type) ?? undefined}
            topInfo={''}
            bottomInfo={formatTimestamp(item.timestamp)}
          />
        {/if}
        {#if item.eventCount > 1}
          <span
            class="badge badge-sm badge-ghost cursor-pointer"
            title="Click to expand {item.eventCount} events"
          >
            {item.eventCount} hops
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <div class="text-right shrink-0">
          {#if isSent}
            <span class="text-error font-bold">{displayAmount}</span>
          {:else}
            <span class="text-success font-bold">{displayAmount}</span>
          {/if}
          <span> CRC</span>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-circle"
          onclick={(e) => { e.stopPropagation(); openTx(); }}
          title="View on block explorer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  </RowFrame>

  <!-- Expanded events drill-down -->
  {#if expanded && item.eventCount > 1}
    <div class="ml-6 pl-4 border-l-2 border-base-300 space-y-2 py-2">
      <!-- Path summary -->
      {#if pathParticipants.length > 1}
        <div class="flex items-center gap-1 text-xs text-base-content/70 flex-wrap pb-1 border-b border-base-200">
          <span class="font-medium">Path:</span>
          {#each pathParticipants as participant, idx}
            {#if idx > 0}
              <span class="text-base-content/40">→</span>
            {/if}
            <button
              class="inline-flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
              title="Click to copy: {participant}"
              onclick={(e) => copyAddress(participant, e)}
            >
              {#if getProfileImage(participant)}
                <img
                  src={getProfileImage(participant)}
                  alt=""
                  class="w-4 h-4 rounded-full object-cover"
                />
              {/if}
              <span>{getShortName(participant)}</span>
            </button>
          {/each}
          <span class="text-base-content/50 ml-1">({hopCount} {hopCount === 1 ? 'hop' : 'hops'})</span>
        </div>
      {/if}

      <!-- Individual events -->
      {#each item.events as event, idx}
        {@const fromName = getDisplayName(event.from, 'from')}
        {@const toName = getDisplayName(event.to, 'to')}
        {@const fromImg = getProfileImage(event.from)}
        {@const toImg = getProfileImage(event.to)}
        {@const isMintEvent = isZero(event.from)}
        {@const isBurnEvent = isZero(event.to)}
        {@const eventAmount = event.circles || event.staticCircles || event.crc || 0}
        <div class="flex items-center justify-between text-sm opacity-90 py-1.5 px-2 rounded hover:bg-base-200">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs text-base-content/50 shrink-0">#{idx + 1}</span>

            <!-- From participant -->
            {#if isMintEvent}
              <span class="badge badge-xs badge-success">mint</span>
            {:else}
              <button
                class="inline-flex items-center gap-1 min-w-0 cursor-pointer hover:text-primary transition-colors"
                title="Click to copy: {event.from}"
                onclick={(e) => copyAddress(event.from, e)}
              >
                {#if fromImg}
                  <img src={fromImg} alt="" class="w-5 h-5 rounded-full object-cover shrink-0" />
                {/if}
                <span class="truncate max-w-[90px] text-xs">{fromName}</span>
              </button>
            {/if}

            <span class="text-base-content/50 shrink-0">→</span>

            <!-- To participant -->
            {#if isBurnEvent}
              <span class="badge badge-xs badge-error">burn</span>
            {:else}
              <button
                class="inline-flex items-center gap-1 min-w-0 cursor-pointer hover:text-primary transition-colors"
                title="Click to copy: {event.to}"
                onclick={(e) => copyAddress(event.to, e)}
              >
                {#if toImg}
                  <img src={toImg} alt="" class="w-5 h-5 rounded-full object-cover shrink-0" />
                {/if}
                <span class="truncate max-w-[90px] text-xs">{toName}</span>
              </button>
            {/if}
          </div>
          <span class="tabular-nums shrink-0 text-xs {eventAmount === 0 ? 'text-base-content/40' : ''}">
            {eventAmount > 0 ? eventAmount.toFixed(2) : '—'} CRC
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
