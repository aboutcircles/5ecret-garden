<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';

  export let profile: Profile | undefined;
  export let showName: boolean = true;
  export let pictureOverlayUrl: string | undefined = undefined;
  export let trustVersion: number | undefined = undefined;
</script>

<div class="inline-flex items-center">
  <button class="cursor-pointer" on:click>
    {#if pictureOverlayUrl}
      <div class="indicator">
        <span class="indicator-item badge bg-blue-100">
          <img
            src={pictureOverlayUrl}
            alt="Overlay"
            class="h-4 rounded-full"
          />
        </span>
        <img
          src={profile?.previewImageUrl}
          alt="User Icon"
          class="w-10 h-10 object-cover rounded-full"
        />
      </div>
    {:else}
      <img
        src={profile?.previewImageUrl}
        alt="User Icon"
        class="w-10 h-10 object-cover rounded-full"
      />
    {/if}
  </button>
  <div class="flex flex-col items-start pl-4 gap-y-0.5">
    {#if showName}
      <span class="font-semibold text-[#161616]">{profile?.name}</span>
      <p class="flex flex-col items-start text-xs text-gray-500">
        <slot></slot>
      </p>
    {/if}
    {#if trustVersion}
      <p class="text-xs text-yellow-500">
        {trustVersion == 1 ? 'This relation was made before migration' : ''}
      </p>
    {/if}
  </div>
</div>
