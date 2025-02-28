<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';

  export let profile: Profile | undefined;
</script>

<div class="w-full flex flex-col items-center text-center">
  <button class="cursor-pointer" on:click>
    <img
      src={profile?.previewImageUrl}
      alt="User Icon"
      class="w-20 h-20 object-cover rounded-full"
    />
  </button>
  <div class="flex flex-col items-center p-4 gap-y-0.5">
    <span class="font-semibold text-[#161616]">{profile?.name}</span>
    {#if profile?.description}
      <p class="text-sm text-gray-500 mt-0">
        {profile?.description}
      </p>
    {/if}
  </div>
</div>
