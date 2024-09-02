<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import {circles} from "$lib/stores/circles";
    import {wallet} from "$lib/stores/wallet";
    import {onMount} from "svelte";
    import type {TrustEvent} from "@circles-sdk/data";

    let trustRelations: TrustEvent[] = [];

    onMount(async () => {
        if ($wallet?.address && $circles) {
            const trustRelationsQuery = $circles.data.getIncomingTrustEvents($wallet.address, 100);
            await trustRelationsQuery.queryNextPage();
            console.log("trustRelations", trustRelationsQuery.currentPage?.results);
            trustRelations = trustRelationsQuery.currentPage?.results ?? [];
        }
    });

    async function registerPerson() {
        await goto("/register/person");
    }

    async function registerAsGroup() {
        await goto("/register/group");
    }

    async function acceptInvitation(inviter: string) {
        await $circles?.acceptInvitation(inviter, "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB");
    }
</script>

<div class="flex flex-col items-center justify-center h-full p-6 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Register a new Account</h1>
    <p class="text-gray-700 mb-6 text-center">Click the button below to register your wallet at Circles.</p>

    <ActionButton action={registerPerson}>
        Register as person
    </ActionButton>

    {#if $circles?.v2Hub}
        <ActionButton action={registerAsGroup}>
            Register as group
        </ActionButton>
    {/if}
    {#each trustRelations as trustRelation}
        <div class="flex items-center justify-between w-full p-4 bg-white rounded-lg shadow-md">
            <div class="flex itemms-center space-x-4">
                <div>
                    <p class="text-lg font-semibold">{trustRelation.truster}</p>
                    <ActionButton action={() => acceptInvitation(trustRelation.truster)}>
                        Accept invitation
                    </ActionButton>
                </div>
            </div>
        </div>
    {/each}
</div>