<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";
    import {popupControls} from "$lib/components/PopUp.svelte";
    import ProfilePage from "$lib/components/ProfilePage.svelte";

    export let profile: Profile | undefined;
    export let clickable: boolean = true;
    export let address: string;
    export let imageStyle: "square" | "circle" = "circle";

    function openAvatar() {
        $popupControls.open?.({
            component: ProfilePage,
            props: {
                address: address
            }
        });
    }
</script>

{#if clickable}
    <a class="w-full flex flex-col items-center space-y-4 p-4 text-center" on:click={openAvatar}>
        <img src={profile?.previewImageUrl ?? "/default-avatar.png"}
             alt="User Icon"
             class="w-64 h-64"
             class:rounded-full={imageStyle === "circle"}>
        <div class="flex flex-col items-center space-y-2">
            <span class="font-bold text-lg">{profile?.name}</span>
            {#if profile?.description}
                <p class="text-sm text-gray-500">
                    {profile?.description}
                    <slot></slot>  <!-- For additional description -->
                </p>
            {/if}
        </div>
    </a>
{:else}
    <div class="w-full flex flex-col items-center space-y-4 p-4 text-center">
        <img src={profile?.previewImageUrl ?? "/default-avatar.png"}
             alt="User Icon"
             class="w-64 h-64"
             class:rounded-full={imageStyle === "circle"}>
        <div class="flex flex-col items-center space-y-2">
            <span class="font-bold text-lg">{profile?.name}</span>
            {#if profile?.description}
                <p class="text-sm text-gray-500">
                    {profile?.description}
                    <slot></slot>
                </p>
            {/if}
        </div>
    </div>
{/if}
