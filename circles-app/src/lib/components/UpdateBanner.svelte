<script lang="ts">
  import GetInvited from '$lib/flows/migrateToV2/1_GetInvited.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import { onMount } from 'svelte';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import CreateProfile from '$lib/flows/migrateToV2/2_CreateProfile.svelte';

  let canSelfMigrate: boolean = false;

  onMount(async () => {
    if (!$avatar?.avatarInfo || !$circles) {
      throw new Error('Avatar store or SDK not initialized');
    }
    canSelfMigrate = await $circles.canSelfMigrate($avatar.avatarInfo);
  });

  async function migrateToV2() {
    popupControls.open({
      title: 'Migrate to v2',
      component: canSelfMigrate ? CreateProfile : GetInvited,
      props: {},
    });
  }
</script>

<button
  class="w-full flex flex-col bg-blue-100 border-t-4 mb-4 border-blue-500 rounded-b text-blue-900 px-4 py-3 shadow-md cursor-pointer fixed top-16 z-10"
  on:click={() => migrateToV2()}
  on:keydown={(e) => e.key === 'Enter' && migrateToV2()}
>
  <p class="font-bold">Circles V2 is here!</p>
  <p class="text-sm">Migrate your avatar to Circles V2.</p>
</button>
