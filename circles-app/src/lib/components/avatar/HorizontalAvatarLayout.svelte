<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";
    import ProfilePage from "$lib/pages/Profile.svelte";
    import {type PopupContentApi, type PopupContentDefinition, popupControls} from "$lib/components/PopUp.svelte";
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

<div class="inline-flex items-center space-x-2">
    <a class="cursor-pointer" on:click={openAvatar}>
        <img src={profile?.previewImageUrl}
             alt="User Icon"
             class="w-8 h-8"
             class:rounded-full={imageStyle === "circle"}>
    </a>
    <div>
        {#if showName}
            <span>{profile?.name}</span>
            <p class="text-xs text-gray-500">
                <slot></slot>
            </p>
        {/if}
    </div>
</div>