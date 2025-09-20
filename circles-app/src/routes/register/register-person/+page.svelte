<script lang="ts">
    import { goto } from '$app/navigation';
    import ActionButton from '$lib/components/ActionButton.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import type { Avatar as AvatarType } from '@circles-sdk/sdk';
    import { circles } from '$lib/stores/circles';
    import { wallet } from '$lib/stores/wallet.svelte';
    import type { AvatarRow } from '@circles-sdk/data';
    import type { Profile } from '@circles-sdk/profiles';
    import { onMount } from 'svelte';
    import type { Address } from '@circles-sdk/utils';
    import ProfileEditor from '$lib/components/ProfileEditor.svelte';
    import { settings } from '$lib/stores/settings.svelte';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import Disclaimer from '$lib/components/Disclaimer.svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { ArrowLeft as LArrowLeft, ExternalLink as LExternalLink, Lock as LLock } from 'lucide';
    import RowFrame from '$lib/ui/RowFrame.svelte';

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
        if (!$wallet?.address) throw new Error('Wallet not connected');
        if (!$circles?.data) throw new Error('Circles SDK not initialized');

        invitations = await $circles.data.getInvitations($wallet.address.toLowerCase() as Address);
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
        if (!$circles) throw new Error('Wallet not connected ($circles is undefined)');
        if (!inviterSelected) throw new Error('Inviter not set');

        avatarState.avatar = (await $circles.acceptInvitation(
            inviterSelected.toLowerCase() as Address,
            profile
        )) as AvatarType;

        await goto('/dashboard');
    }
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
    <svelte:fragment slot="title"><h1 class="h2 m-0">Register Person</h1></svelte:fragment>
    <svelte:fragment slot="meta">Step 1 of 2</svelte:fragment>
    <svelte:fragment slot="actions">
        <button type="button" class="btn btn-ghost btn-sm" onclick={() => history.back()} aria-label="Back">
            <Lucide icon={LArrowLeft} size={16} class="shrink-0 stroke-black" />
            <span>Back</span>
        </button>
    </svelte:fragment>

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
                    <div class="flex flex-col gap-y-2 pl-10 text-sm">
                        {#if invitations.length > 0}
                            {#each invitations as inviter (inviter.avatar)}
                                <RowFrame clickable={true} dense={true} noLeading={true} on:click={() => (inviterSelected = inviter.avatar)}>
                                    <div class="flex items-center gap-x-2 min-w-0">
                                        <input
                                                type="radio"
                                                name="inviter"
                                                class="radio radio-success radio-sm"
                                                checked={inviterSelected === inviter.avatar}
                                                onclick={(e) => { e.stopPropagation(); inviterSelected = inviter.avatar; }}
                                        />
                                        <Avatar topInfo="Inviter" clickable={false} address={inviter.avatar} view="horizontal" />
                                    </div>
                                </RowFrame>
                            {/each}
                        {:else}
                            No invitations pending. <a href="/link-to-telegram" class="underline inline-flex items-center">
                            Get help <Lucide icon={LExternalLink} size={12} class="shrink-0 stroke-black ml-1" ariaLabel="" />
                        </a>
                        {/if}
                    </div>

                    <ul class="steps steps-vertical mt-4">
                        <li data-content="2" class={`step ${inviterSelected ? 'step-primary' : ''}`}>Register</li>
                    </ul>

                    <div class="flex flex-col items-center gap-y-4 pl-10">
                        {#if inviterSelected}
                            <ProfileEditor bind:profile />
                            <div class="mx-auto">
                                <ActionButton action={registerHuman} disabled={profile.name.trim().length < 1}>
                                    Create
                                </ActionButton>
                            </div>
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
