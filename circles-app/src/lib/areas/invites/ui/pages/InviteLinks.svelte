<script lang="ts">
  import { onMount } from 'svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { popupState } from '$lib/shared/state/popup';
  import { loadReferrals, type StoredReferral } from '../../data/referralLinkStore';
  import {
    getReferralStatus,
    retryUnsavedReferrals,
    referralsAvailable,
    type ReferralLifecycle,
  } from '../../data/referralService';
  import { buildReferralLink } from '../../constants';
  import { openCreateInviteFlow } from '../../flows/createInvite/openCreateInviteFlow';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  let referrals = $state<StoredReferral[]>([]);
  let statusByKey = $state<Record<string, ReferralLifecycle | undefined>>({});
  const available = referralsAvailable();

  function loadLocal() {
    const inviter = avatarState.avatar?.address as Address | undefined;
    referrals = inviter ? loadReferrals(inviter) : [];
  }

  async function syncStatuses() {
    const inviter = avatarState.avatar?.address as Address | undefined;
    if (!inviter || !available) return;
    await retryUnsavedReferrals(inviter);
    loadLocal(); // saved flags may have changed during retry
    const next: Record<string, ReferralLifecycle | undefined> = { ...statusByKey };
    await Promise.allSettled(
      referrals.map(async (r) => {
        try {
          const info = await getReferralStatus(r.privateKey);
          next[r.privateKey] = info.status;
        } catch {
          next[r.privateKey] = undefined; // not indexed yet / not found
        }
      }),
    );
    statusByKey = next;
  }

  onMount(() => {
    loadLocal();
    void syncStatuses();
  });

  // Refresh when a popup (e.g. the create flow) closes, so a newly-created link
  // appears without a manual reload.
  let prevPopupOpen = false;
  $effect(() => {
    const open = $popupState.content !== null;
    if (prevPopupOpen && !open) {
      loadLocal();
      void syncStatuses();
    }
    prevPopupOpen = open;
  });

  function badge(status: ReferralLifecycle | undefined): {
    label: string;
    color: string;
    bg: string;
  } {
    switch (status) {
      case 'claimed':
        return { label: 'Joined', color: T.positive, bg: T.positiveSoft };
      case 'confirmed':
        return { label: 'Account created', color: T.primaryDeep, bg: T.primarySoft };
      case 'stale':
      case 'expired':
        return { label: 'Expired', color: T.inkMuted, bg: T.pageDeep };
      case 'pending':
      default:
        return { label: 'Awaiting claim', color: T.warning, bg: T.warningSoft };
    }
  }

  function formatDate(ms: number): string {
    try {
      return new Date(ms).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  let copiedKey = $state<string | null>(null);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  async function copyRow(pk: string) {
    try {
      await navigator.clipboard.writeText(buildReferralLink(pk));
      copiedKey = pk;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copiedKey = null), 2000);
    } catch (e) {
      console.warn('[invites] clipboard write failed', e);
    }
  }

  async function shareRow(pk: string) {
    const url = buildReferralLink(pk);
    if (canShare) {
      try {
        await navigator.share({
          title: 'Join me on Circles',
          text: 'I’d like to invite you to Circles. Use my link to join:',
          url,
        });
      } catch {
        // user dismissed the share sheet — not an error
      }
    } else {
      await copyRow(pk);
    }
  }
</script>

<div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">
  <div style="padding:8px 18px 24px;" class="md:!p-9 md:max-w-[1280px] md:mx-auto">

    <!-- Page title + primary action -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 14px;gap:12px;">
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
        <span style="font-family:{T.fontDisplay};font-size:32px;color:{T.ink};letter-spacing:-0.02em;line-height:1;font-weight:400;">Invite links</span>
        <span style="font-size:12.5px;color:{T.inkMuted};">{referrals.length} {referrals.length === 1 ? 'link' : 'links'} created</span>
      </div>
      {#if available}
        <button
          onclick={openCreateInviteFlow}
          style="
            height:40px;padding:0 14px;border-radius:9999px;flex-shrink:0;
            background:{T.primary};color:#fff;border:0;cursor:pointer;
            display:inline-flex;align-items:center;gap:6px;
            font-family:{T.fontSans};font-size:13.5px;font-weight:540;
            box-shadow:0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(15,10,30,0.12);
          "
        >
          <Icon name="plus" size={15} stroke="#fff" strokeWidth={2.0} />
          New link
        </button>
      {/if}
    </div>

    <!-- Intro / explainer -->
    <div style="display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border-radius:16px;background:{T.surface};border:1px solid {T.hairlineSoft};box-shadow:{T.shadow.xs};">
      <Icon name="sparkle" size={15} stroke={T.primary} style="flex-shrink:0;margin-top:1px;" />
      <span style="font-size:12.5px;color:{T.inkMuted};line-height:1.5;">
        Share an invite link to bring someone new into Circles — no wallet required. They open it in the Circles wallet to join, and you earn a share of the Circles they create in their first year.
      </span>
    </div>

    {#if !available}
      <div style="margin-top:14px;background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:32px 16px;text-align:center;">
        <span style="font-size:13.5px;color:{T.inkMuted};">Invite links aren’t available on this network.</span>
      </div>
    {:else}
      <!-- Section heading -->
      <span style="display:block;font-size:11.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin-top:18px;margin-bottom:8px;padding-left:4px;">
        Your links
      </span>

      {#if referrals.length === 0}
        <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:32px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;border-radius:9999px;background:{T.primarySoft};display:flex;align-items:center;justify-content:center;">
            <Icon name="link" size={20} stroke={T.primary} />
          </div>
          <span style="font-size:13.5px;color:{T.inkMuted};">No invite links yet</span>
          <button
            onclick={openCreateInviteFlow}
            style="
              height:38px;padding:0 16px;border-radius:9999px;
              background:{T.primary};color:#fff;border:0;cursor:pointer;
              display:inline-flex;align-items:center;gap:6px;
              font-family:{T.fontSans};font-size:13px;font-weight:540;
            "
          >
            <Icon name="plus" size={14} stroke="#fff" strokeWidth={2.0} />
            Create your first link
          </button>
        </div>
      {:else}
        <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};overflow:hidden;box-shadow:{T.shadow.xs};">
          {#each referrals as r, i (r.privateKey)}
            {@const b = badge(statusByKey[r.privateKey])}
            <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;{i > 0 ? `border-top:1px solid ${T.hairlineSoft};` : ''}">
              <div style="width:36px;height:36px;border-radius:9999px;background:{T.primaryFaint};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <Icon name="link" size={16} stroke={T.primary} />
              </div>
              <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:13.5px;font-weight:540;color:{T.ink};">Invite link</span>
                  <span style="font-size:10.5px;font-weight:600;color:{b.color};background:{b.bg};padding:2px 8px;border-radius:9999px;">{b.label}</span>
                </div>
                <span style="font-size:11.5px;color:{T.inkMuted};">Created {formatDate(r.createdAt)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <button
                  onclick={() => copyRow(r.privateKey)}
                  aria-label="Copy invite link"
                  title="Copy link"
                  style="width:34px;height:34px;border-radius:9999px;background:{copiedKey === r.privateKey ? T.sageSoft : T.pageDeep};border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
                >
                  <Icon name={copiedKey === r.privateKey ? 'check' : 'copy'} size={15} stroke={copiedKey === r.privateKey ? T.positive : T.inkBody} />
                </button>
                <button
                  onclick={() => shareRow(r.privateKey)}
                  aria-label="Share invite link"
                  title="Share link"
                  style="width:34px;height:34px;border-radius:9999px;background:{T.primarySoft};border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
                >
                  <Icon name="share" size={15} stroke={T.primaryDeep} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <div style="height:24px;"></div>
  </div>
</div>
