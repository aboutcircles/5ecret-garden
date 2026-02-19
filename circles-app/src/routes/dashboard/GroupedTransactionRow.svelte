<script lang="ts">
  import { getTimeAgo } from '$lib/shared/utils/shared';
  import type { GroupedTransaction } from '$lib/shared/state/transactionHistory';
  import { getEnrichedProfile, prefetchProfilesForAddresses, profileCacheVersion, getErc20WrapperOwner } from '$lib/shared/state/transactionHistory';
  import { notify } from '$lib/shared/state/notifications.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import Profile from '$lib/areas/profile/ui/pages/Profile.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Flame, RefreshCw, ArrowLeftRight, ExternalLink, Copy } from 'lucide';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { Address } from '@aboutcircles/sdk-types';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { getGroupName } from '$lib/shared/state/groupNameCache';

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  /**
   * Get resolved CRC amount from an event, with hex value fallback.
   * Handles RPC returning hex-encoded bigints (e.g. "0x53444835ec580000").
   */
  function resolveEventAmount(e: { circles?: number; staticCircles?: number; crc?: number; value?: string }): number {
    const amount = e.circles ?? e.staticCircles ?? e.crc ?? 0;
    if (amount > 0) return amount;
    if (!e.value || e.value === '0') return 0;
    const s = String(e.value).trim();
    if (s.startsWith('0x') || s.startsWith('0X')) {
      try { return Number(BigInt(s)) / 1e18; } catch { return 0; }
    }
    const n = parseFloat(s);
    return n > 1e15 ? n / 1e18 : n;
  }

  // Known contract addresses (Gnosis mainnet) - display friendly names instead of hex
  const KNOWN_CONTRACTS: Record<string, string> = {
    // Circles v2 Hub
    '0xc12c1e50abb450d6205ea2c3fa861b3b834d13e8': 'Hub v2',
    // Circles v1 Hub
    '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543': 'Hub v1',
    // Name Registry
    '0xa27566fd89162cc3d40cb59c87aaaa49b85f3474': 'Name Registry',
    // Standard Treasury
    '0x08f90ab73a515308f03a718257ff9887ed330c6e': 'Treasury',
    // Invitation Escrow
    '0x8f8b74fa13eaaff4176d061a0f98ad5c8e19c903': 'Invitation Escrow',
    // Invitation Farm
    '0xd28b7c4f148b1f1e190840a1f7a796c5525d8902': 'Invitation Farm',
    // Referrals Module
    '0x12105a9b291af2abb0591001155a75949b062ce5': 'Referrals',
    // Base Group Mint Policy
    '0xcca27c26cf7bac2a9928f42201d48220f0e3a549': 'Group Mint Policy',
    // Core Members Group Deployer
    '0xfeca40eb02fb1f4f5f795fc7a03c1a27819b1ded': 'Group Deployer',
    // Lift ERC20 Factory
    '0x5f99a795dd2743c36d63511f0d4bc667e6d3cdb5': 'Lift ERC20',
    // Base Group Factory
    '0xd0b5bd9962197beac4cba24244ec3587f19bd06d': 'Group Factory',
    // Rings Hub v2
    '0x3d61f0a272ec69d65f5cff097212079aafde8267': 'Rings Hub',
    // Rings Name Registry
    '0x8d1bebbf5b8dfcef0f7e2039e4106a76cb66f968': 'Rings Registry',
    // Rings Treasury
    '0x3545955bc3900bda704261e4991f239bbd99ece5': 'Rings Treasury',
    // Invitation Module (96 CRC fee for inviting new users)
    '0x00738aca013b7b2e6cfe1690f0021c3182fa40b5': 'Invite Module',
    // gCRC: DemurrageCircles ERC-20 wrapper (users wrap CRC here for DeFi/exchanges)
    '0x548c20e6c24e4876e20dadbeab75362e2f5a4bc1': 'gCRC Wrapper',
  };

  // Lift ERC20 factory address - used to detect ERC20 wrapper tokens
  const LIFT_ERC20_FACTORY = '0x5f99a795dd2743c36d63511f0d4bc667e6d3cdb5';

  // Invite Module address - users pay 96 CRC fee (burned) to invite new users
  const INVITE_MODULE_ADDRESS = '0x00738aca013b7b2e6cfe1690f0021c3182fa40b5';

  /**
   * Detect if this transaction is an invite: involves invite module + has burn
   */
  function isInviteTransaction(tx: GroupedTransaction): boolean {
    const inviteLower = INVITE_MODULE_ADDRESS;
    return tx.hasBurn && tx.events.some(e =>
      e.from?.toLowerCase() === inviteLower ||
      e.to?.toLowerCase() === inviteLower
    );
  }

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

  // Subscribe to profile cache version to trigger re-renders when names are fetched
  // This enables progressive loading: show address first, then replace with name
  const cacheVersion = $derived($profileCacheVersion);

  /**
   * Get display name for an address: profile name, group name, known contract, or truncated address
   * Returns special labels for zero address (mint/burn indicator)
   * Note: This function is reactive via cacheVersion dependency
   */
  function getDisplayName(address: string | undefined, context?: 'from' | 'to'): string {
    // Reference cacheVersion to make this reactive (re-evaluates when profiles are fetched)
    void cacheVersion;
    if (!address) return '?';
    if (isZero(address)) {
      return context === 'from' ? '⊕ Mint' : '🔥 Burn';
    }
    // Check known contracts first
    const knownName = KNOWN_CONTRACTS[address.toLowerCase()];
    if (knownName) return knownName;
    // Then check profile
    const profile = getEnrichedProfile(address as Address);
    if (profile?.name) return profile.name;
    // Then check group name cache
    const groupName = getGroupName(address as Address);
    if (groupName) return groupName;
    // Check if it's an ERC20 wrapper - resolve to owner's name
    const wrapperOwner = getErc20WrapperOwner(address as Address);
    if (wrapperOwner) {
      const ownerProfile = getEnrichedProfile(wrapperOwner);
      if (ownerProfile?.name) return `${ownerProfile.name} (ERC20)`;
      const ownerGroupName = getGroupName(wrapperOwner);
      if (ownerGroupName) return `${ownerGroupName} (ERC20)`;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get short display name (max 12 chars) for path summary
   * Reactive via cacheVersion dependency
   */
  function getShortName(address: string | undefined): string {
    void cacheVersion; // Reactive dependency
    if (!address) return '?';
    // Check known contracts first
    const knownName = KNOWN_CONTRACTS[address.toLowerCase()];
    if (knownName) {
      return knownName.length > 12 ? knownName.slice(0, 10) + '…' : knownName;
    }
    const profile = getEnrichedProfile(address as Address);
    if (profile?.name) {
      return profile.name.length > 12 ? profile.name.slice(0, 10) + '…' : profile.name;
    }
    // Check group name cache
    const groupName = getGroupName(address as Address);
    if (groupName) {
      return groupName.length > 12 ? groupName.slice(0, 10) + '…' : groupName;
    }
    // Check ERC20 wrapper owner
    const wrapperOwner = getErc20WrapperOwner(address as Address);
    if (wrapperOwner) {
      const ownerProfile = getEnrichedProfile(wrapperOwner);
      if (ownerProfile?.name) {
        const name = ownerProfile.name;
        return name.length > 10 ? name.slice(0, 8) + '…' : name;
      }
      const ownerGroupName = getGroupName(wrapperOwner);
      if (ownerGroupName) {
        return ownerGroupName.length > 10 ? ownerGroupName.slice(0, 8) + '…' : ownerGroupName;
      }
    }
    return `${address.slice(0, 6)}…`;
  }

  /**
   * Get profile image URL if available
   * Reactive via cacheVersion dependency
   */
  function getProfileImage(address: string | undefined): string | undefined {
    void cacheVersion; // Reactive dependency
    if (!address) return undefined;
    const profile = getEnrichedProfile(address as Address);
    if (profile?.previewImageUrl) return profile.previewImageUrl;
    // Check ERC20 wrapper owner
    const wrapperOwner = getErc20WrapperOwner(address as Address);
    if (wrapperOwner) {
      const ownerProfile = getEnrichedProfile(wrapperOwner);
      if (ownerProfile?.previewImageUrl) return ownerProfile.previewImageUrl;
    }
    return undefined;
  }

  interface Props {
    item: GroupedTransaction;
    /** Transaction hash to highlight (from URL deep-link) */
    highlightTx?: string;
  }
  let { item, highlightTx }: Props = $props();

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
      if (visibleEventCount > 1) {
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

  // Fetch missing profiles when expanding pass-through rows
  // This ensures addresses in the path are resolved to names
  $effect(() => {
    if (expanded && visibleEventCount > 1) {
      // Collect addresses that don't have cached names
      const uncachedAddresses = pathParticipants.filter(
        addr => !getEnrichedProfile(addr as Address)?.name &&
                !KNOWN_CONTRACTS[addr.toLowerCase()] &&
                !getGroupName(addr as Address)
      );
      if (uncachedAddresses.length > 0) {
        prefetchProfilesForAddresses(uncachedAddresses);
      }
    }
  });

  // Update URL when clicking the row (for sharing)
  function handleRowClick() {
    if (canExpand) {
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

  /**
   * Calculate the total amount routed through the user for intermediary transactions.
   * Takes max of (incoming, outgoing) since they're approximately equal in pass-throughs.
   */
  function getRoutedAmount(): number {
    const userAddr = avatarState.avatar?.address?.toLowerCase();
    if (!userAddr) return 0;

    const getAmount = (e: typeof item.events[0]) => Math.abs(resolveEventAmount(e));

    // Sum incoming (user is `to`)
    const incoming = item.events
      .filter(e => e.to?.toLowerCase() === userAddr && e.from?.toLowerCase() !== ZERO_ADDRESS)
      .reduce((sum, e) => sum + getAmount(e), 0);

    // Sum outgoing (user is `from`)
    const outgoing = item.events
      .filter(e => e.from?.toLowerCase() === userAddr && e.to?.toLowerCase() !== ZERO_ADDRESS)
      .reduce((sum, e) => sum + getAmount(e), 0);

    // Return the larger value (both should be ~equal for true pass-throughs)
    return Math.max(incoming, outgoing);
  }

  const routedAmount = $derived(getRoutedAmount());

  function openTx() {
    const url = 'https://gnosisscan.io/tx/' + item.transactionHash;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Open Profile modal for an address and update URL for deep-linking
   */
  function viewProfile(address: string, event: MouseEvent) {
    event.stopPropagation();
    // Update URL with profile address for sharing/refresh persistence
    const url = new URL($page.url);
    url.searchParams.set('profile', address);
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });

    popupControls.open({
      title: 'Profile',
      component: Profile,
      props: { address: address as Address },
      onClose: () => {
        // Clear profile param from URL when modal closes
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('profile');
        goto(currentUrl.toString(), { replaceState: true, keepFocus: true, noScroll: true });
      },
    });
  }

  const isSent = $derived(item.netCircles < 0);
  const displayAmount = $derived(
    `${isSent ? '-' : '+'}${formatNetCircles(item.netCircles)}`
  );

  /**
   * Compute path summary for multi-hop transactions.
   * For pass-through (intermediary) transactions: show Source → You → Destination
   * For regular multi-hop: show unique participants in order of appearance
   */
  const pathParticipants = $derived.by(() => {
    if (visibleEventCount <= 1) return [];

    const userAddr = avatarState.avatar?.address;
    const userLower = userAddr?.toLowerCase();

    // For intermediary transactions, build a clearer Source → You → Destination path
    if (item.isIntermediary && userAddr) {
      let source: string | undefined;
      let destination: string | undefined;

      for (const event of item.events) {
        const fromLower = event.from?.toLowerCase();
        const toLower = event.to?.toLowerCase();

        // Find incoming (someone → user)
        if (toLower === userLower && fromLower && fromLower !== ZERO_ADDRESS && fromLower !== userLower) {
          source = event.from;
        }
        // Find outgoing (user → someone)
        if (fromLower === userLower && toLower && toLower !== ZERO_ADDRESS && toLower !== userLower) {
          destination = event.to;
        }
      }

      // Build ordered path with user in middle
      const path: string[] = [];
      if (source) path.push(source);
      if (userAddr) path.push(userAddr);
      if (destination) path.push(destination);

      return path;
    }

    // For regular multi-hop: unique participants in order of appearance
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

  // Count visible events after filtering (excludes zero-amount and mint→burn internal events)
  // For intermediary/burn, use resolveEventAmount (tries hex fallback) before filtering
  const visibleEvents = $derived(
    item.events.filter(e => {
      const fromZero = isZero(e.from);
      const toZero = isZero(e.to);
      // Always skip internal protocol events (both from AND to are zero)
      if (fromZero && toZero) return false;
      // Use full amount resolution (including hex fallback)
      const amount = resolveEventAmount(e);
      if (amount > 0) return true;
      // For pass-throughs and burns, also show events between real addresses
      // even if amount is 0 — but only if they involve real participants (not just mint/burn)
      if ((item.isIntermediary || item.type === 'burn') && !fromZero && !toZero) return true;
      return false;
    })
  );
  const visibleEventCount = $derived(visibleEvents.length);

  // Can this row be expanded?
  const canExpand = $derived(
    visibleEventCount > 1 || ((item.isIntermediary || item.type === 'burn') && item.events.length > 1)
  );
  const hopCount = $derived(visibleEventCount > 1 ? visibleEventCount - 1 : 0);

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
      case 'hop':
        return '/badge-sent.svg'; // Tokens went out, but not user-initiated
      default:
        return isSent ? '/badge-sent.svg' : '/badge-received.svg';
    }
  }

  /**
   * Get human-readable transaction summary based on type and counterparty
   * Replaces technical event labels with user-friendly descriptions
   * Reactive via cacheVersion dependency
   */
  function getTransactionSummary(): string {
    void cacheVersion; // Reactive dependency
    const counterpartyIsZero = isZero(item.counterparty);
    const counterpartyName = getDisplayName(item.counterparty);

    switch (item.type) {
      case 'send':
        // Safety: never show "Sent to 🔥 Burn" - that should be a burn type
        if (counterpartyIsZero) {
          return 'Burned';
        }
        // Invite module: user paid CRC fee to invite a new user
        if (isInviteTransaction(item)) {
          return 'Invited a new user';
        }
        return `Sent to ${counterpartyName}`;
      case 'hop':
        // User's trust path was used by someone else for their transfer
        const initiatorName = item.initiator ? getDisplayName(item.initiator) : 'someone';
        return `Routed by ${initiatorName}`;
      case 'receive':
        // Safety: never show "Received from ⊕ Mint" - that should be a mint type
        if (counterpartyIsZero) {
          return item.hasMint ? 'Minted' : 'Received';
        }
        return `Received from ${counterpartyName}`;
      case 'mint':
        // Check if it's a group mint or personal mint
        if (item.eventTypes?.some(t => t.includes('GroupMint'))) {
          const groupName = item.groupAddress ? getDisplayName(item.groupAddress) : 'group';
          return `Minted ${groupName} tokens`;
        }
        return 'Minted Circles';
      case 'burn': {
        if (item.eventTypes?.some(t => t.includes('GroupRedeem'))) {
          const groupName = item.groupAddress ? getDisplayName(item.groupAddress) : 'group';
          // Quote short group names for clarity (e.g. "q" instead of just q)
          const displayGroupName = groupName.length <= 3 ? `"${groupName}"` : groupName;
          const burnAmt = Math.abs(item.netCircles);
          const amtStr = burnAmt < 0.01 ? '< 0.01 CRC' : `${burnAmt.toFixed(2)} CRC`;
          return `Redeemed ${displayGroupName} tokens (${amtStr})`;
        }
        return 'Burned';
      }
      case 'complex':
        if (item.hasMint && item.hasBurn) {
          return 'Conversion';
        }
        // Operator-only: user signed/initiated but tokens flowed between others
        if (item.isOperatorOnly) {
          return `Relayed for ${counterpartyName}`;
        }
        // Small net amounts in complex transactions - show as path transfer
        if (Math.abs(item.netCircles) <= 0.05 && item.netCircles !== 0) {
          return item.netCircles > 0
            ? `Path transfer (net +${formatNetCircles(item.netCircles)})`
            : `Path transfer (net ${formatNetCircles(item.netCircles)})`;
        }
        // Don't show zero address as counterparty
        if (counterpartyIsZero) {
          return item.hasMint ? 'Token Operation' : 'Transfer';
        }
        // For larger amounts, show direction clearly
        if (item.netCircles > 0) {
          return `Received via ${counterpartyName}`;
        } else if (item.netCircles < 0) {
          return `Sent via ${counterpartyName}`;
        }
        return `Multi-path with ${counterpartyName}`;
      default:
        return counterpartyIsZero ? 'Transaction' : counterpartyName;
    }
  }

  const transactionSummary = $derived(getTransactionSummary());
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
        {#if item.isIntermediary}
          <!-- Pass-through hop: user's trust path was used, net gain/loss is minimal -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 shrink-0 rounded-full bg-base-300/50 grid place-items-center">
              <Lucide icon={ArrowLeftRight} size={20} class="text-base-content/60" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-medium text-base-content/80">Pass-through</span>
              <span class="text-sm text-base-content/60">
                Routed {routedAmount.toFixed(2)} CRC · {formatTimestamp(item.timestamp)}
              </span>
            </div>
          </div>
        {:else if item.type === 'send' || item.type === 'receive'}
          <!-- Send/Receive: prioritize showing the counterparty, even if hasMint/hasBurn (those are incidental) -->
          <Avatar
            address={item.counterparty}
            view="horizontal"
            clickable={true}
            pictureOverlayUrl={getBadgeUrl(item.type) ?? undefined}
            topInfo={transactionSummary}
            bottomInfo={formatTimestamp(item.timestamp)}
          />
        {:else if item.type === 'hop'}
          <!-- Hop: user's tokens used by someone else - show initiator's avatar -->
          <Avatar
            address={item.initiator ?? item.counterparty}
            view="horizontal"
            clickable={true}
            pictureOverlayUrl={getBadgeUrl(item.type) ?? undefined}
            topInfo={transactionSummary}
            bottomInfo={formatTimestamp(item.timestamp)}
          />
        {:else if item.type === 'complex' && item.hasMint && item.hasBurn}
          <!-- Complex: show combined icon only when type is explicitly complex (e.g., group token conversion) -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-error/20 to-success/20 grid place-items-center">
              <Lucide icon={RefreshCw} size={20} class="text-base-content" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-medium">Conversion</span>
              <span class="text-sm text-base-content/60">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
          </div>
        {:else if item.type === 'mint'}
          <!-- Mint: show user's own avatar with received badge -->
          <Avatar
            address={avatarState.avatar?.address}
            view="horizontal"
            clickable={true}
            pictureOverlayUrl="/badge-received.svg"
            topInfo={transactionSummary}
            bottomInfo={formatTimestamp(item.timestamp)}
          />
        {:else if item.type === 'burn'}
          <!-- Burn: show burn icon (even for multi-event txs with burn) -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 shrink-0 rounded-full bg-error/20 grid place-items-center">
              <Lucide icon={Flame} size={20} class="text-error" strokeWidth={2} />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-medium">{transactionSummary}</span>
              <span class="text-sm text-base-content/60">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
          </div>
        {:else}
          <Avatar
            address={item.counterparty}
            view="horizontal"
            clickable={true}
            pictureOverlayUrl={getBadgeUrl(item.type) ?? undefined}
            topInfo={transactionSummary}
            bottomInfo={formatTimestamp(item.timestamp)}
          />
        {/if}
        {#if visibleEventCount > 1 || ((item.isIntermediary || item.type === 'burn') && item.events.length > 1)}
          <!-- Expand indicator - subtle chevron instead of hops badge -->
          <span
            class="text-base-content/40 text-sm cursor-pointer"
            title="Click to expand {visibleEventCount} events"
          >
            {expanded ? '▼' : '▶'}
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <div class="text-right shrink-0">
          {#if item.isIntermediary}
            <!-- Pass-through: show net ±0 indicator instead of confusing +< 0.01 -->
            <span class="text-base-content/50 font-medium">±0</span>
            <span class="text-base-content/50"> CRC</span>
          {:else if isSent}
            <span class="text-error font-bold">{displayAmount}</span>
            <span> CRC</span>
          {:else}
            <span class="text-success font-bold">{displayAmount}</span>
            <span> CRC</span>
          {/if}
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
  {#if expanded && canExpand}
    {@const userAddr = avatarState.avatar?.address?.toLowerCase()}
    {@const userReceived = item.events
      .filter(e => e.to?.toLowerCase() === userAddr && !isZero(e.from))
      .reduce((sum, e) => sum + resolveEventAmount(e), 0)}
    {@const userSent = item.events
      .filter(e => e.from?.toLowerCase() === userAddr && !isZero(e.to))
      .reduce((sum, e) => sum + resolveEventAmount(e), 0)}
    {@const receivedFrom = item.events.find(e => e.to?.toLowerCase() === userAddr && !isZero(e.from))?.from}
    {@const sentTo = item.events.find(e => e.from?.toLowerCase() === userAddr && !isZero(e.to))?.to}
    <div class="ml-6 pl-4 border-l-2 border-base-300 space-y-2 py-2">
      <!-- Your involvement summary -->
      {#if userReceived > 0 || userSent > 0}
        <div class="bg-base-200/50 rounded-lg p-2 text-xs space-y-1">
          <span class="font-medium text-base-content/70">Your involvement:</span>
          {#if isInviteTransaction(item)}
            <!-- Invite transaction: show clear fee description instead of confusing wash -->
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              <span class="text-error">
                Paid {userSent.toFixed(2)} CRC invite fee (burned)
              </span>
            </div>
          {:else}
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            {#if userReceived > 0}
              <span class="text-success">
                +{userReceived.toFixed(2)} CRC
                {#if receivedFrom}
                  <span class="text-base-content/60">from {getShortName(receivedFrom)}</span>
                {/if}
              </span>
            {/if}
            {#if userSent > 0}
              <span class="text-error">
                -{userSent.toFixed(2)} CRC
                {#if sentTo}
                  <span class="text-base-content/60">to {getShortName(sentTo)}</span>
                {/if}
              </span>
            {/if}
          </div>
          {/if}
        </div>
      {/if}

      <!-- Path summary -->
      {#if pathParticipants.length > 1}
        <div class="flex items-center gap-1 text-xs text-base-content/70 flex-wrap pb-1 border-b border-base-200">
          <span class="font-medium">Path:</span>
          {#each pathParticipants as participant, idx}
            {@const isCurrentUser = participant.toLowerCase() === avatarState.avatar?.address?.toLowerCase()}
            {#if idx > 0}
              <span class="text-base-content/40">→</span>
            {/if}
            <div class="dropdown dropdown-hover">
              <button
                tabindex="0"
                class="inline-flex items-center gap-1 cursor-pointer hover:text-primary transition-colors {isCurrentUser ? 'font-semibold text-primary' : ''}"
                title={participant}
              >
                {#if getProfileImage(participant)}
                  <img
                    src={getProfileImage(participant)}
                    alt=""
                    class="w-4 h-4 rounded-full object-cover"
                  />
                {/if}
                <span>{isCurrentUser ? 'You' : getShortName(participant)}</span>
              </button>
              {#if !isCurrentUser}
                <ul tabindex="0" class="dropdown-content menu menu-xs bg-base-100 rounded-box shadow-lg z-20 w-32 p-1">
                  <li>
                    <button onclick={(e) => copyAddress(participant, e)}>
                      <Lucide icon={Copy} size={12} />
                      Copy
                    </button>
                  </li>
                  <li>
                    <button onclick={(e) => viewProfile(participant, e)}>
                      <Lucide icon={ExternalLink} size={12} />
                      View
                    </button>
                  </li>
                </ul>
              {/if}
            </div>
          {/each}
          <span class="text-base-content/50 ml-1">({hopCount} {hopCount === 1 ? 'hop' : 'hops'})</span>
        </div>
      {/if}

      <!-- Individual events (uses same visibleEvents filter as count) -->
      {#each visibleEvents as event, idx}
        {@const fromName = getDisplayName(event.from, 'from')}
        {@const toName = getDisplayName(event.to, 'to')}
        {@const fromImg = getProfileImage(event.from)}
        {@const toImg = getProfileImage(event.to)}
        {@const isMintEvent = isZero(event.from)}
        {@const isBurnEvent = isZero(event.to)}
        {@const eventAmount = resolveEventAmount(event)}
        <div class="flex items-center justify-between text-sm opacity-90 py-1.5 px-2 rounded hover:bg-base-200">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs text-base-content/50 shrink-0">#{idx + 1}</span>
            {#if event.eventType}
              <span class="badge badge-xs badge-ghost text-[10px]" title={event.eventType}>
                {event.eventType.replace('CrcV2_', '').replace('Crc_', '')}
              </span>
            {/if}

            <!-- From participant -->
            {#if isMintEvent}
              <span class="badge badge-xs badge-success">mint</span>
            {:else}
              {@const fromIsUser = event.from?.toLowerCase() === avatarState.avatar?.address?.toLowerCase()}
              <div class="dropdown dropdown-hover">
                <button
                  tabindex="0"
                  class="inline-flex items-center gap-1 min-w-0 cursor-pointer hover:text-primary transition-colors {fromIsUser ? 'font-semibold text-primary' : ''}"
                  title={event.from}
                >
                  {#if fromImg}
                    <img src={fromImg} alt="" class="w-5 h-5 rounded-full object-cover shrink-0" />
                  {/if}
                  <span class="truncate max-w-[90px] text-xs">{fromIsUser ? 'You' : fromName}</span>
                </button>
                {#if !fromIsUser && event.from}
                  <ul tabindex="0" class="dropdown-content menu menu-xs bg-base-100 rounded-box shadow-lg z-20 w-32 p-1">
                    <li><button onclick={(e) => copyAddress(event.from, e)}><Lucide icon={Copy} size={12} /> Copy</button></li>
                    <li><button onclick={(e) => viewProfile(event.from!, e)}><Lucide icon={ExternalLink} size={12} /> View</button></li>
                  </ul>
                {/if}
              </div>
            {/if}

            <span class="text-base-content/50 shrink-0">→</span>

            <!-- To participant -->
            {#if isBurnEvent}
              <span class="badge badge-xs badge-error">burn</span>
            {:else}
              {@const toIsUser = event.to?.toLowerCase() === avatarState.avatar?.address?.toLowerCase()}
              <div class="dropdown dropdown-hover">
                <button
                  tabindex="0"
                  class="inline-flex items-center gap-1 min-w-0 cursor-pointer hover:text-primary transition-colors {toIsUser ? 'font-semibold text-primary' : ''}"
                  title={event.to}
                >
                  {#if toImg}
                    <img src={toImg} alt="" class="w-5 h-5 rounded-full object-cover shrink-0" />
                  {/if}
                  <span class="truncate max-w-[90px] text-xs">{toIsUser ? 'You' : toName}</span>
                </button>
                {#if !toIsUser && event.to}
                  <ul tabindex="0" class="dropdown-content menu menu-xs bg-base-100 rounded-box shadow-lg z-20 w-32 p-1">
                    <li><button onclick={(e) => copyAddress(event.to, e)}><Lucide icon={Copy} size={12} /> Copy</button></li>
                    <li><button onclick={(e) => viewProfile(event.to!, e)}><Lucide icon={ExternalLink} size={12} /> View</button></li>
                  </ul>
                {/if}
              </div>
            {/if}
          </div>
          <span class="tabular-nums shrink-0 text-xs {eventAmount === 0 ? 'text-base-content/40' : ''}">
            {eventAmount.toFixed(2)} CRC
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
