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

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
    {#snippet title()}<h1 class="h2 m-0">Register Person</h1>{/snippet}
    {#snippet meta()}Step 1 of 2{/snippet}
    {#snippet headerActions()}
        <ActionButtonBar {actions} />
    {/snippet}
    {#snippet collapsedMenu()}<ActionButtonDropDown {actions} />{/snippet}

    <div class="mt-3"><Disclaimer /></div>

    <section class="mt-4">
        <h2 class="text-sm font-semibold text-base-content/70 tracking-wide uppercase">Register</h2>
        <div class="mt-2 space-y-2">
            <div class="bg-base-100 border rounded-xl px-4 py-3 shadow-sm flex flex-col items-center w-full">
                <p class="text-lg">Register person</p>
                <div class="w-full">
                    <ul class="steps steps-vertical">
                        <li class="step step-primary">Select Inviter</li>
                    </ul>

                    <!-- Invitations list -->
                    <div class="pl-10">
                        <InvitationPickerStep
                            {invitations}
                            bind:selected={inviterSelected}
                            onSelect={(address) => (inviterSelected = address)}
                        >
                            <svelte:fragment slot="empty">
                                No invitations pending. <a href="/link-to-telegram" class="underline inline-flex items-center">
                                    Get help <Lucide icon={LExternalLink} size={12} class="shrink-0 stroke-black ml-1" ariaLabel="" />
                                </a>
                            </svelte:fragment>
                        </InvitationPickerStep>
                    </div>

                    <ul class="steps steps-vertical mt-4">
                        <li data-content="2" class={`step ${inviterSelected ? 'step-primary' : ''}`}>Register</li>
                    </ul>

                    <div class="flex flex-col items-center gap-y-4 pl-10">
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
                            <Lucide icon={LLock} size={28} class="shrink-0 stroke-black" ariaLabel="" />
                            <p>Select an inviter to continue</p>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </section>
</PageScaffold>
