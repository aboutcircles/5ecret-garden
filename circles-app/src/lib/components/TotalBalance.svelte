<script lang="ts">
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import { roundToDecimals } from '$lib/utils/shared';
  import { popupControls } from '$lib/stores/popUp';
  import Balances from "$lib/pages/Balances.svelte";

  let personalToken: number = $derived(
    $circlesBalances?.data?.filter((balance) => !balance.isGroup).length
  );
  let groupToken: number = $derived(
    $circlesBalances?.data?.filter((balance) => balance.isGroup).length
  );

  function openBalances() {
      popupControls.open({
          title: "",
          component: Balances,
          props: {}
      })
  }
</script>

<div class="flex flex-col items-center gap-y-4 w-full mt-10">
  <a onclick={openBalances} class="h2 cursor-pointer">
    {roundToDecimals($totalCirclesBalance)} Circles
  </a>
  <a onclick={openBalances} class="text-sm cursor-pointer">
    {personalToken} individual tokens • {groupToken} group tokens •
    <span class="underline"> See breakdown </span>
  </a>
</div>
