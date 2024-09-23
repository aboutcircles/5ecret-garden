<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";
    import {type PopupContentApi, type PopupContentDefinition, popupControls} from "$lib/components/PopUp.svelte";
    import ProfilePage from "$lib/pages/Profile.svelte";
    import {shortenAddress} from "$lib/utils/shared";

    export let profile: Profile | undefined;
    export let imageStyle: "square" | "circle" = "circle";
    export let showName: boolean = true;
    export let pictureOverlayUrl: string | undefined = undefined;
</script>

<div class="w-full flex flex-col items-center space-y-2 text-center">
    <a class="cursor-pointer" on:click>
        <img src={profile?.previewImageUrl ?? "/default-avatar.png"}
             alt="User Icon"
             class="w-8 h-8"
             class:rounded-full={imageStyle === "circle"}>
    </a>
    <div class="flex flex-col items-center">
        {#if showName}
            <span>{profile?.name}</span>
        {/if}
        <span class="text-sm text-gray-500">
            <slot></slot>
        </span>
    </div>
</div>