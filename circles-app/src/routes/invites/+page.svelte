<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { canCreateInviteLinks } from '$lib/areas/invites/data/canCreateInviteLinks';
  import InviteLinks from '$lib/areas/invites/ui/pages/InviteLinks.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  const inviteable = $derived(canCreateInviteLinks(avatarState.avatar));
</script>

{#if avatarState.avatar && inviteable}
  <InviteLinks />
{:else}
  <div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};display:flex;align-items:center;justify-content:center;padding:32px 18px;">
    <div style="max-width:360px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;">
      <div style="width:52px;height:52px;border-radius:9999px;background:{T.primarySoft};display:flex;align-items:center;justify-content:center;">
        <Icon name="link" size={24} stroke={T.primary} />
      </div>
      {#if !avatarState.avatar}
        <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;">Connect your wallet</span>
        <span style="font-size:13px;color:{T.inkMuted};line-height:1.5;">Connect a Circles account to create and share invite links.</span>
        <a href="/" style="margin-top:4px;height:40px;padding:0 18px;border-radius:9999px;background:{T.primary};color:#fff;text-decoration:none;display:inline-flex;align-items:center;font-size:13.5px;font-weight:540;">Go to home</a>
      {:else}
        <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;">Invites unavailable</span>
        <span style="font-size:13px;color:{T.inkMuted};line-height:1.5;">Only human Circles accounts can create invite links.</span>
        <a href="/dashboard" style="margin-top:4px;height:40px;padding:0 18px;border-radius:9999px;background:{T.primary};color:#fff;text-decoration:none;display:inline-flex;align-items:center;font-size:13.5px;font-weight:540;">Back to wallet</a>
      {/if}
    </div>
  </div>
{/if}
