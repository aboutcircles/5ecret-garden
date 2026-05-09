<script lang="ts">
    import { goto } from '$app/navigation';
    import type { Avatar as AvatarType } from '@circles-sdk/sdk';
    import { circles } from '$lib/shared/state/circles';
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import type { AvatarRow } from '@circles-sdk/data';
    import type { Profile } from '@circles-sdk/profiles';
    import { onMount } from 'svelte';
    import type { Address } from '@circles-sdk/utils';
    import { ProfileFormStep } from '$lib/shared/ui/profile';
    import { settings } from '$lib/shared/state/settings.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import Disclaimer from '$lib/areas/register/ui/components/RegistrationDisclaimer.svelte';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { ArrowLeft as LArrowLeft, ExternalLink as LExternalLink, Lock as LLock } from 'lucide';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';
    import InvitationPickerStep from '$lib/shared/ui/invitations/InvitationPickerStep.svelte';
    import { requireCircles, requireWalletAddress } from '$lib/shared/flow/guards';
    import { get } from 'svelte/store';

    let invitations: AvatarRow[] = $state([]);
    let inviterSelected: Address | undefined = $state(
        settings.ring ? '0x0000000000000000000000000000000000000000' : undefined
    );

    let profile: Profile = $state({
        name: '',
        description: '',
        previewImageUrl: '',
        imageUrl: undefined,
    });

    onMount(async () => {
        const walletAddress = requireWalletAddress($wallet?.address as Address | undefined, 'Wallet not connected');
        const sdk = requireCircles(get(circles));

        invitations = await sdk.data.getInvitations(walletAddress.toLowerCase() as Address);
        if (settings.ring) {
            invitations = [
                ...invitations,
                {
                    avatar: '0x0000000000000000000000000000000000000000',
                    timestamp: 0, transactionHash: '',
                    version: 2, type: 'CrcV2_RegisterHuman', hasV1: true, isHuman: false,
                    blockNumber: 0, transactionIndex: 0, logIndex: 0,
                },
            ];
        }
    });

    async function registerHuman() {
        const sdk = requireCircles(get(circles));
        const inviter = requireWalletAddress(inviterSelected, 'Inviter not set');

        avatarState.avatar = (await sdk.acceptInvitation(
            inviter.toLowerCase() as Address,
            profile
        )) as AvatarType;

        await goto('/dashboard');
    }

    function goBack() {
        history.back();
    }

    const actions: Action[] = [
        { id: 'back', label: 'Back', iconNode: LArrowLeft, onClick: goBack, variant: 'ghost' }
    ];
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true}>
    {#snippet title()}<h1 class="h2 m-0">Register Person</h1>{/snippet}
    {#snippet meta()}Step 1 of 2{/snippet}
    {#snippet headerActions()}
        <ActionButtonBar {actions} />
    {/snippet}
    {#snippet collapsedMenu()}<ActionButtonDropDown {actions} />{/snippet}

    <div style="margin-top:12px;"><Disclaimer /></div>

    <section style="margin-top:16px;">
        <h2 style="font-size:11px;font-weight:600;color:rgba(15,10,30,0.62);letter-spacing:0.06em;text-transform:uppercase;margin:0 0 8px 0;">Register</h2>
        <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="background:#FFFFFF;border:1px solid rgba(31,17,70,0.08);border-radius:12px;padding:16px 12px;box-shadow:0 1px 2px rgba(15,10,30,0.04);display:flex;flex-direction:column;align-items:center;width:100%;">
                <p style="font-size:18px;margin:0 0 12px 0;">Register person</p>
                <div style="width:100%;">
                    <ol style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px;">
                        <li style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                            <span style="width:20px;height:20px;border-radius:9999px;background:#5849D4;color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">1</span>
                            <span style="font-size:13px;font-weight:500;">Select Inviter</span>
                        </li>
                    </ol>

                    <!-- Invitations list -->
                    <div style="padding-left:28px;">
                        <InvitationPickerStep
                            {invitations}
                            bind:selected={inviterSelected}
                            onSelect={(address) => (inviterSelected = address)}
                        >
                            <svelte:fragment slot="empty">
                                No invitations pending. <a href="/link-to-telegram" style="text-decoration:underline;display:inline-flex;align-items:center;">
                                    Get help <Lucide icon={LExternalLink} size={12} class="shrink-0 ml-1" ariaLabel="" />
                                </a>
                            </svelte:fragment>
                        </InvitationPickerStep>
                    </div>

                    <ol style="list-style:none;padding:0;margin:16px 0 0 0;display:flex;flex-direction:column;gap:4px;">
                        <li style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                            <span style="width:20px;height:20px;border-radius:9999px;background:{inviterSelected ? '#5849D4' : 'rgba(31,17,70,0.08)'};color:{inviterSelected ? '#fff' : 'rgba(15,10,30,0.40)'};font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">2</span>
                            <span style="font-size:13px;font-weight:500;">Register</span>
                        </li>
                    </ol>

                    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding-left:28px;">
                        {#if inviterSelected}
                            <ProfileFormStep
                                bind:name={profile.name}
                                bind:description={profile.description}
                                bind:previewImageUrl={profile.previewImageUrl}
                                bind:imageUrl={profile.imageUrl}
                                onSubmit={registerHuman}
                                submitLabel="Create"
                            />
                        {:else}
                            <Lucide icon={LLock} size={28} class="shrink-0" ariaLabel="" />
                            <p style="margin:0;">Select an inviter to continue</p>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </section>
</PageScaffold>
