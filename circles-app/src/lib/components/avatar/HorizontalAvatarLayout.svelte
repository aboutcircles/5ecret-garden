<script lang="ts">
    import type {Profile} from "@circles-sdk/profiles";

    export let profile: Profile | undefined;
    export let clickable: boolean = true;
    export let address: string;
    export let imageStyle: "square" | "circle" = "circle";
</script>

{#if clickable}
    <a class="inline-flex items-center space-x-2" href={"/_new/avatar/" + address}>
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
