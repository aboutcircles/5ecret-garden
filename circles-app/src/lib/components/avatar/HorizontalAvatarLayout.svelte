<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";
    import ProfilePage from "$lib/components/ProfilePage.svelte";
    import {popupControls} from "$lib/components/PopUp.svelte";

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
    <a class="inline-flex items-center space-x-2" on:click={openAvatar}>
        <img src={profile?.previewImageUrl}
             alt="User Icon"
             class="w-8 h-8"
             class:rounded-full={imageStyle === "circle"}>
        <div>
            <span>{profile?.name}</span>
            <p class="text-xs text-gray-500">
                <slot></slot>
            </p>
        </div>
    </a>
{:else}
    <span class="inline-flex items-center space-x-2">
        <img src={profile?.previewImageUrl}
             alt="User Icon"
             class="w-8 h-8"
             class:rounded-full={imageStyle === "circle"}>
        <div>
            <span>{profile?.name}</span>
            <p class="text-xs text-gray-500">
                <slot></slot>
            </p>
        </div>
    </span>
{/if}
