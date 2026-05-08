<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { executeTxSubmitFirst } from '$lib/shared/utils/txExecution';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import { popupControls } from '$lib/shared/state/popup';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';

  interface Props { address: `0x${string}`; }
  let { address }: Props = $props();

  async function invite() {
    if (!avatarState.avatar) throw new Error('Avatar store not available');
    void executeTxSubmitFirst({
      name: `Inviting ${shortenAddress(address)}…`,
      submit: () => avatarState.avatar!.inviteHuman(address),
      onSubmitted: () => popupControls.close(),
    });
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
  <!-- Hero with eyebrow -->
  <div style="display:flex;flex-direction:column;gap:4px;">
    <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.015em;line-height:1.15;">
      Invite to Circles
    </span>
    <span style="font-size:12.5px;color:{T.inkMuted};line-height:1.5;">
      You're about to invite this address to Circles.
    </span>
  </div>

  <!-- Address card -->
  <div style="
    background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
    padding:14px 16px;display:flex;flex-direction:column;gap:6px;
  ">
    <span style="font-size:10.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Recipient</span>
    <span style="font-family:{T.fontMono};font-size:13px;color:{T.ink};word-break:break-all;line-height:1.4;">
      {shortenAddress(address)}
    </span>
    <a
      href={`https://gnosisscan.io/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      style="
        display:inline-flex;align-items:center;gap:5px;width:fit-content;margin-top:4px;
        font-family:{T.fontSans};font-size:11.5px;color:{T.primary};font-weight:540;text-decoration:none;
      "
    >
      <Icon name="external" size={11} stroke={T.primary} />
      View on Gnosisscan
    </a>
  </div>

  <!-- Info row -->
  <div style="display:flex;align-items:flex-start;gap:8px;padding:0 4px;">
    <Icon name="info" size={13} stroke={T.inkMuted} style="flex-shrink:0;margin-top:2px;" />
    <span style="font-size:12px;color:{T.inkMuted};line-height:1.5;">
      The person will appear in your contacts once they accept the invitation.
    </span>
  </div>

  <!-- Action -->
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
    <ActionButton
      action={invite}
      class="btn btn-primary w-full"
      data-popup-default-action
    >Invite</ActionButton>
  </div>
</div>
