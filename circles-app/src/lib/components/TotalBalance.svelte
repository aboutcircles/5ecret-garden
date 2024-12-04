<script>
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import { roundToDecimals } from '$lib/utils/shared';
</script>

<div class="flex flex-col items-center gap-y-4 w-full mt-10">
  <p class="text-sm text-black/50">Your Balance</p>
  <div class="stat-value">
    {roundToDecimals($totalCirclesBalance)} Circles
  </div>
  <p class="text-sm">
    {$circlesBalances?.data?.length} individual tokens •
    <a href="/dashboard/balances" class="underline"> See breakdown </a>
  </p>
</div>
