<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import { CREATE_GROUP_FLOW_SCAFFOLD_BASE } from './constants';
    import { T } from '$lib/design-system/tokens.js';
    import { circles } from '$lib/shared/state/circles';
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import { runTask } from '$lib/shared/utils/tasks';
    import { popupControls } from '$lib/shared/state/popup';
    import ProfilePreviewCard from '$lib/shared/ui/profile/ProfilePreviewCard.svelte';
    import { isValidSymbol, isValidName } from '$lib/shared/utils/isValid';
    import {
        createGroupContext,
        type CreateGroupFlowContext,
        resetCreateGroupContext
    } from './context';
    import { assertWalletCanSignForSafe } from '$lib/shared/integrations/safe/assertWalletCanSignForSafe';
    import type { Address } from '@aboutcircles/sdk-types';
    import AdvancedDetails from '$lib/shared/ui/flow/AdvancedDetails.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';

    const PROFILE_NAME_MAX_LENGTH = 36;

    interface Props {
        context?: CreateGroupFlowContext;
        setGroup?: (address: string) => void;
    }

    let { context = $bindable(), setGroup }: Props = $props();

    let ctx: CreateGroupFlowContext = $state($createGroupContext);
    $effect(() => {
        const hasIncoming = !!context && typeof context === 'object';
        if (hasIncoming) {
            ctx = context as CreateGroupFlowContext;
        }
    });

    async function createGroup() {
        const hasSdk: boolean = !!$circles;
        const hasWallet: boolean = !!$wallet?.address;
        const profileNameLength: number = (ctx.profile.name ?? '').trim().length;
        const profileNameOk: boolean = profileNameLength > 0 && profileNameLength <= PROFILE_NAME_MAX_LENGTH;
        const symbolOk: boolean = isValidSymbol(ctx.profile.symbol);
        const onChainOk: boolean = isValidName(onChainName);
        if (!hasSdk) { throw new Error('SDK not initialized'); }
        if (!hasWallet) { throw new Error('Wallet not connected'); }
        if (!profileNameOk || !symbolOk || !onChainOk) {
            throw new Error('Invalid profile name (required, max 36 chars), symbol, or on-chain name');
        }

        await runTask({
            name: `Creating ${ctx.profile.symbol} group …`,
            promise: (async () => {
                if (!$circles) { throw new Error('SDK not initialized'); }
                if (!$wallet) { throw new Error('Wallet not initialized'); }

                // Preflight for Safe-based signing flows to fail fast with a clear message.
                // Kept inside runTask so failures open the global dismissable error popup.
                await assertWalletCanSignForSafe(String($wallet.address));

                console.log($wallet.address, ctx);
                const ownerAddress: `0x${string}` = $wallet.address as `0x${string}`;

                // sdk.register.asGroup handles profile CID creation, on-chain registration,
                // and returns the resulting BaseGroupAvatar directly.
                const groupAvatar = await $circles.register.asGroup(
                    ownerAddress,
                    ctx.service,
                    ctx.feeCollection,
                    ctx.initialConditions,
                    onChainName,
                    ctx.profile.symbol,
                    ctx.profile
                );

                const groupAddress = groupAvatar.address;

                // Notify caller (e.g., ConnectCircles) so it can connect the new group and navigate
                try {
                    setGroup?.(groupAddress);
                } catch (e) {
                    console.error('setGroup callback failed', e);
                }

                // Reset context so a new flow starts clean next time
                resetCreateGroupContext(ownerAddress);

                return groupAddress;
            })()
        });

        popupControls.close();
    }

    const hasDesc: boolean = $derived(!!ctx.profile.description && ctx.profile.description.trim().length > 0);
    const onChainName = $derived(ctx.profile.onChainName ?? ctx.profile.name);
    const fastLane = $derived((ctx.settingsMode ?? 'fast') === 'fast');
</script>

<FlowStepScaffold
  {...CREATE_GROUP_FLOW_SCAFFOLD_BASE}
  step={3}
  title="Review"
  subtitle="Confirm details and create the group on-chain."
>

    <p style="font-size:12.5px;color:{T.inkMuted};margin:0;">Your profile will be written and the group deployed on-chain.</p>

    <!-- Summary card -->
    <div style="border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;background:{T.surface};">
        <div style="padding:10px 14px;border-bottom:1px solid {T.hairlineSoft};">
            <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Group details</span>
        </div>
        <div style="display:flex;flex-direction:column;">
            <div style="padding:9px 14px;border-bottom:1px solid {T.hairlineSoft};display:flex;justify-content:space-between;gap:8px;">
                <span style="font-size:12px;color:{T.inkMuted};">Name</span>
                <span style="font-size:12.5px;font-weight:540;color:{T.ink};">{ctx.profile.name}</span>
            </div>
            <div style="padding:9px 14px;border-bottom:1px solid {T.hairlineSoft};display:flex;justify-content:space-between;gap:8px;">
                <span style="font-size:12px;color:{T.inkMuted};">Symbol</span>
                <span style="font-family:{T.fontMono};font-size:12.5px;font-weight:540;color:{T.ink};">{ctx.profile.symbol}</span>
            </div>
            <div style="padding:9px 14px;display:flex;justify-content:space-between;gap:8px;">
                <span style="font-size:12px;color:{T.inkMuted};">On-chain name</span>
                <span style="font-family:{T.fontMono};font-size:12px;color:{T.ink};">{onChainName}</span>
            </div>
        </div>
    </div>

    <ProfilePreviewCard profile={ctx.profile} title="Group profile" />

    <AdvancedDetails title="Advanced group details" subtitle="On-chain settings">
        {#if !fastLane}
            <div style="font-size:10.5px;font-weight:600;color:{T.inkMuted};text-transform:uppercase;letter-spacing:0.05em;margin-top:6px;">Service</div>
            <Avatar address={ctx.service} view="horizontal" clickable={false} bottomInfo={ctx.service} showTypeInfo={true} />
            <div style="font-size:10.5px;font-weight:600;color:{T.inkMuted};text-transform:uppercase;letter-spacing:0.05em;margin-top:8px;">Fee collection</div>
            <Avatar address={ctx.feeCollection} view="horizontal" clickable={false} bottomInfo={ctx.feeCollection} showTypeInfo={true} />
            <div style="font-size:12px;color:{T.inkMuted};margin-top:6px;">Initial conditions: <strong style="color:{T.ink};">{ctx.initialConditions.length}</strong></div>
        {:else}
            <div style="font-size:12px;color:{T.inkMuted};">Simple mode — default service and fee collection settings.</div>
        {/if}
    </AdvancedDetails>

    <div style="display:flex;justify-content:flex-end;margin-top:4px;">
        <button
            type="button"
            style="
                height:44px;padding:0 24px;border-radius:9999px;border:0;cursor:pointer;
                background:{T.primary};color:#fff;
                font-family:{T.fontSans};font-size:14px;font-weight:580;
                box-shadow:0 4px 12px rgba(88,73,212,0.25);
            "
            onclick={createGroup}
        >Confirm &amp; Create</button>
    </div>
    </FlowStepScaffold>
