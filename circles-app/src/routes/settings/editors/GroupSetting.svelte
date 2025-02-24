<script lang="ts">
  import { avatar } from '$lib/stores/avatar';

  let groupSetting = {
    service: '',
    mintHandler: '',
    redemptionHandler: '',
  };
</script>

<div class="space-y-2">
  {#if $avatar}
    <div>
      <label for="circlesAddress" class="block text-sm font-medium text-black"
        >Service address</label
      >
      <input
        type="text"
        id="circlesAddress"
        readonly
        value={$avatar?.avatarInfo?.avatar}
        class="mt-2 block w-full p-2 border border-gray-300 rounded-md"
        placeholder="0x....."
      />
    </div>
    <div>
      <label for="tokenAddress" class="block text-sm font-medium text-black"
        >Mint Handler address</label
      >
      <input
        type="text"
        id="tokenAddress"
        class="mt-2 block w-full p-2 border border-gray-300 rounded-md"
        readonly
        value={groupSetting.mintHandler}
        placeholder="0x....."
      />
    </div>

    <div>
      <label for="name" class="block text-sm font-medium text-black"
        >Redemption Handler address</label
      >
      <input
        bind:value={groupSetting.redemptionHandler}
        type="text"
        id="name"
        class="mt-2 block w-full p-2 border border-gray-300 bg-gray-50 rounded-md"
        placeholder="Name"
      />
    </div>
  {/if}
</div>
