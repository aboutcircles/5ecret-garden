<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { runTask } from '../../routes/+layout.svelte';
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import { shortenAddress } from '$lib/utils/shared';

  export let address: string;
  export let contentApi: PopupContentApi;

  async function trust() {
    if (!$avatar) {
      throw new Error('Avatar store not available');
    }
    runTask({
      name: `Trusting ${shortenAddress(address)} ...`,
      promise: $avatar!.trust(address),
    });
    contentApi.close();
  }
</script>

<div class="flex flex-col gap-y-4 mt-8">
  <p>You're about to trust the following group or person:</p>
  <Avatar {address} clickable={false}>
    {address}
  </Avatar>
  <div role="alert" class="flex gap-x-2 bg-[#FDE8E8] p-2 rounded-lg">
    <svg
      class="h-6 w-6"
      viewBox="0 0 18 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7.43165 3.28909C8.12015 2.06509 9.88145 2.06509 10.5691 3.28909L15.5911 12.2171C16.2661 13.4177 15.3994 14.8991 14.0233 14.8991H3.97835C2.60135 14.8991 1.73465 13.4177 2.40965 12.2171L7.43165 3.28909ZM9.90035 12.2C9.90035 12.4387 9.80553 12.6676 9.63675 12.8364C9.46797 13.0052 9.23905 13.1 9.00035 13.1C8.76166 13.1 8.53274 13.0052 8.36396 12.8364C8.19517 12.6676 8.10035 12.4387 8.10035 12.2C8.10035 11.9613 8.19517 11.7324 8.36396 11.5636C8.53274 11.3948 8.76166 11.3 9.00035 11.3C9.23905 11.3 9.46797 11.3948 9.63675 11.5636C9.80553 11.7324 9.90035 11.9613 9.90035 12.2ZM9.00035 4.99999C8.76166 4.99999 8.53274 5.09482 8.36396 5.2636C8.19517 5.43238 8.10035 5.6613 8.10035 5.89999V8.59999C8.10035 8.83869 8.19517 9.06761 8.36396 9.23639C8.53274 9.40517 8.76166 9.49999 9.00035 9.49999C9.23905 9.49999 9.46797 9.40517 9.63675 9.23639C9.80553 9.06761 9.90035 8.83869 9.90035 8.59999V5.89999C9.90035 5.6613 9.80553 5.43238 9.63675 5.2636C9.46797 5.09482 9.23905 4.99999 9.00035 4.99999Z"
        fill="#DF7B6B"
      />
    </svg>
    <span class="text-[#DF7B6B] font-semibold"
      >Trusting someone means that you accept their tokens at the same value as
      your own.</span
    >
  </div>

  <div>
    <button
      type="submit"
      class="btn btn-primary text-white"
      on:click={async () => await trust()}>Trust</button
    >
  </div>
</div>
