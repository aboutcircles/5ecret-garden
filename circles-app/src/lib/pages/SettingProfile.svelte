<script lang="ts">
  import { circles } from '$lib/stores/circles';
  import type { Profile } from '@circles-sdk/profiles';
  import Avatar, { getProfile } from '$lib/components/Avatar.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { shortenAddress } from '$lib/utils/shared';
  import type { AvatarRow } from '@circles-sdk/data';
  import Trust from '$lib/pages/Trust.svelte';
  import SelectAsset from '$lib/flows/send/2_Asset.svelte';
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import QrCode from '$lib/components/QrCode.svelte';

  export let address: string | undefined;
  export let contentApi: PopupContentApi | undefined;

  $: {
    if (address) {
      initialize(address);
    }
  }

  let otherAvatar: AvatarRow | undefined;
  let profile: Profile | undefined;
  let members: string[] | undefined = undefined;

  async function initialize(address?: string) {
    if (!address) {
      return;
    }
    if (!$circles) {
      return;
    }
    if (!$avatar) {
      return;
    }

    otherAvatar = await $circles.data.getAvatarInfo(address);
    if (otherAvatar) {
      profile = await getProfile(otherAvatar.avatar);
      console.log(profile);
    }

    if (otherAvatar?.type === 'CrcV2_RegisterGroup') {
      // load the members
      const groupTrustRelations =
        await $circles.data.getAggregatedTrustRelations(otherAvatar.avatar);
      members = groupTrustRelations
        .filter((row) => row.relation === 'trusts')
        .map((o) => o.objectAvatar);
    } else {
      members = undefined;
    }

    if (!profile) {
      profile = {
        name: otherAvatar?.name ?? address,
      };
    }
  }
</script>

<div
  class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto gap-y-8 mt-10"
>
  <Avatar view="vertical" clickable={false} {address} />

  <button
    on:click={() => navigator.clipboard.writeText(address)}
    class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer"
  >
    {address}
    <img src="/copy.svg" alt="Copy" class="w-4 h-4 inline" />
  </button>

  <div class="p-2 shadow-lg rounded-lg my-8">
    <QrCode value={address} />
  </div>
</div>
