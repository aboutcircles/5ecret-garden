<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import type { Address } from '@aboutcircles/sdk-types';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { isHumanAvatar } from '$lib/shared/utils/avatarHelpers';
  import { circles } from '$lib/shared/state/circles';
  import { totalCirclesBalance } from '$lib/shared/state/totalCirclesBalance';
  import { executeTxConfirmFirst } from '$lib/shared/utils/txExecution';
  import { replaceStep } from '$lib/shared/flow';
  import {
    addReferral,
    markSaved,
    removeReferral,
  } from '../../data/referralLinkStore';
  import { saveReferral } from '../../data/referralService';
  import InviteLinkReady from './InviteLinkReady.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';

  // The invite fee is ~96 CRC; we refine it from-chain on mount.
  const DEFAULT_FEE_CRC = 96;
  let feeCrc = $state(DEFAULT_FEE_CRC);

  onMount(async () => {
    const avatar = avatarState.avatar;
    if (!avatar || !isHumanAvatar(avatar)) return;
    try {
      const fee = await avatar.invitation.getInvitationFee();
      if (fee && fee > 0n) feeCrc = Number(fee) / 1e18;
    } catch (e) {
      console.debug('[invites] could not load invitation fee, using default', e);
    }
  });

  const insufficient = $derived($totalCirclesBalance < feeCrc);

  async function createLink() {
    const avatar = avatarState.avatar;
    if (!avatar || !isHumanAvatar(avatar)) {
      throw new Error('Only human Circles accounts can create invite links');
    }
    const sdk = get(circles);
    if (!sdk?.contractRunner?.sendTransaction) {
      throw new Error('Wallet is not ready to send transactions');
    }
    const inviter = avatar.address as Address;

    const { transactions, privateKey } = await avatar.invitation.getReferralCode();
    // Persist the key before sending so a crash mid-flow leaves it recoverable.
    addReferral(inviter, privateKey, { saved: false });

    try {
      await executeTxConfirmFirst({
        name: 'Creating invite link …',
        submit: () => sdk.contractRunner!.sendTransaction!(transactions),
        onSuccess: async () => {
          try {
            await saveReferral(inviter, privateKey);
            markSaved(inviter, privateKey);
          } catch (e) {
            // The link is still recovered by retryUnsavedReferrals on next load.
            console.warn('[invites] saveReferral deferred to retry', e);
          }
        },
      });
    } catch (e) {
      // Creation transaction failed → no on-chain account, so the key is a dead
      // link. Drop it so it never shows up as a shareable link.
      removeReferral(inviter, privateKey);
      throw e;
    }

    replaceStep({ title: '', component: InviteLinkReady, props: { privateKey } });
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
  <!-- Hero -->
  <div style="display:flex;flex-direction:column;gap:4px;">
    <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;line-height:1.15;">
      Create an invite link
    </span>
    <span style="font-size:12.5px;color:{T.inkMuted};line-height:1.5;">
      Generate a link you can share with anyone. They join Circles with it — no wallet needed.
    </span>
  </div>

  <!-- Cost card -->
  <div style="
    background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
    padding:14px 16px;display:flex;flex-direction:column;gap:8px;
  ">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <span style="font-size:13px;color:{T.inkBody};">Cost to create</span>
      <span style="font-family:{T.fontDisplay};font-size:18px;color:{T.ink};letter-spacing:-0.01em;">≈ {feeCrc.toFixed(0)} CRC</span>
    </div>
    <div style="height:1px;background:{T.hairlineSoft};"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <span style="font-size:12px;color:{T.inkMuted};">Your balance</span>
      <span style="font-size:12.5px;font-weight:540;color:{insufficient ? T.negative : T.inkBody};">{$totalCirclesBalance.toFixed(2)} CRC</span>
    </div>
  </div>

  <!-- Info row -->
  <div style="display:flex;align-items:flex-start;gap:8px;padding:0 4px;">
    <Icon name="info" size={13} stroke={T.inkMuted} style="flex-shrink:0;margin-top:2px;" />
    <span style="font-size:12px;color:{T.inkMuted};line-height:1.5;">
      When someone joins with your link, you earn a share of the Circles they create for their first year.
    </span>
  </div>

  {#if insufficient}
    <div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:12px;background:{T.negativeSoft};border:1px solid {T.hairlineSoft};">
      <Icon name="info" size={13} stroke={T.negative} style="flex-shrink:0;margin-top:2px;" />
      <span style="font-size:12px;color:{T.negative};line-height:1.5;">
        You need at least {feeCrc.toFixed(0)} CRC to create an invite link.
      </span>
    </div>
  {/if}

  <!-- Action -->
  <ActionButton
    action={createLink}
    disabled={insufficient}
    style="width:100%;"
    data-popup-default-action
  >Create invite link</ActionButton>
</div>
