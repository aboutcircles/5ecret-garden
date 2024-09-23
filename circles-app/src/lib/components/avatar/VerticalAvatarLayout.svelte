<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";

    export let profile: Profile | undefined;
    export let imageStyle: "square" | "circle" = "circle";
    export let showName: boolean = true;
    export let pictureOverlayUrl: string | undefined = undefined;
</script>

<div class="w-full flex flex-col items-center space-y-4 p-4 text-center">
    <a class="cursor-pointer" on:click>
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