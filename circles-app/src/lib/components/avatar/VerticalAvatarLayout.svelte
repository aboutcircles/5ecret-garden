<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";
    import {type PopupContentApi, type PopupContentDefinition, popupControls} from "$lib/components/PopUp.svelte";
    import ProfilePage from "$lib/pages/Profile.svelte";
    import {shortenAddress} from "$lib/utils/shared";

    export let profile: Profile | undefined;
    export let clickable: boolean = true;
    export let address: string;
    export let imageStyle: "square" | "circle" = "circle";
    export let showName: boolean = true;
    export let contentApi: PopupContentApi | undefined;

    function openAvatar() {
        if (!clickable) {
            return;
        }
        const nextPage: PopupContentDefinition = {
            title: shortenAddress(address),
            component: ProfilePage,
            props: {
                address: address
            }
        };
        if (contentApi) {
            contentApi.open(nextPage);
        } else {
            $popupControls.open?.(nextPage);
        }
    }
</script>

<div class="w-full flex flex-col items-center space-y-4 p-4 text-center">
    <a class="cursor-pointer" on:click={openAvatar}>
        <img src={profile?.previewImageUrl ?? "/default-avatar.png"}
             alt="User Icon"
             class="w-64 h-64"
             class:rounded-full={imageStyle === "circle"}>
    </a>
    <div class="flex flex-col items-center space-y-2">
        {#if showName}
            <span class="font-bold text-lg">{profile?.name}</span>
        {/if}
        {#if profile?.description}
            <p class="text-sm text-gray-500">
                {profile?.description}
                <slot></slot>  <!-- For additional description -->
            </p>
        {:else}
            <p class="text-sm text-gray-500">
                <slot></slot>  <!-- For additional description -->
            </p>
        {/if}
    </div>
</div>