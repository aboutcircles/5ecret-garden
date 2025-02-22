<script lang="ts">
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import { roundToDecimals } from '$lib/utils/shared';

  let personalToken: number;
  let groupToken: number;

  $: {
    personalToken =
      $circlesBalances?.data?.filter((balance) => !balance.isGroup).length ?? 0;
    groupToken =
      $circlesBalances?.data?.filter((balance) => balance.isGroup).length ?? 0;
  }
</script>

<div class="flex flex-col items-center gap-y-4 w-full mt-10">
  <p class="text-sm text-black/50">Your Balance</p>
  <div class="stat-value">
    {roundToDecimals($totalCirclesBalance)} Circles
  </div>
  <p class="text-sm">
    {personalToken} individual tokens • {groupToken} group tokens •
    <a href="/dashboard/balances" class="underline"> See breakdown </a> •
    <a href="/dashboard/account-statement" class="underline"> See account statement </a>
  </p>
</div>
