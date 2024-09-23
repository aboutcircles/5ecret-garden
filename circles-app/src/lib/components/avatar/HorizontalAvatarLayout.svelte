<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";

    export let profile: Profile | undefined;
    export let imageStyle: "square" | "circle" = "circle";
    export let showName: boolean = true;
    export let pictureOverlayUrl: string | undefined = undefined;
</script>

<div class="inline-flex items-center space-x-2">
    <a class="cursor-pointer" on:click>
        {#if pictureOverlayUrl}
            <div class="indicator">
                <span class="indicator-item badge bg-blue-100">
                    <img src={pictureOverlayUrl}
                         class="h-6"
                         class:rounded-full={imageStyle === "circle"}>
                </span>
                <img src={profile?.previewImageUrl}
                     alt="User Icon"
                     class="w-8 h-8"
                     class:rounded-full={imageStyle === "circle"}>
            </div>
        {:else}
            <img src={profile?.previewImageUrl}
                 alt="User Icon"
                 class="w-8 h-8"
                 class:rounded-full={imageStyle === "circle"}>
        {/if}
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