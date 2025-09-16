<script lang="ts">
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import { roundToDecimals } from '$lib/utils/shared';

  let personalToken: number = $derived(
    $circlesBalances?.data?.filter((balance) => !balance.isGroup).length
  );
  let groupToken: number = $derived(
    $circlesBalances?.data?.filter((balance) => balance.isGroup).length
  );
</script>

<div class="flex flex-col items-center gap-y-4 w-full mt-10">
  <div class="h2">
    {roundToDecimals($totalCirclesBalance)} Circles
  </div>
  <p class="text-sm">
    {personalToken} individual tokens • {groupToken} group tokens •
    <a href="/dashboard/balances" class="underline"> See breakdown </a>
  </p>
</div>
