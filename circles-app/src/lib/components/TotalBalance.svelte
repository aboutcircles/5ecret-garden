<script>
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import {roundToDecimals} from "$lib/utils/shared";
</script>

<div class="flex flex-col items-center gap-y-4 w-full border rounded-lg py-4">
  <p class="bg-gray-200 py-1 px-4 rounded-full text-sm">Balance</p>
  <div class="stat-value">
    {roundToDecimals($totalCirclesBalance)} Circles
  </div>
  <a href="/_new/dashboard/balances" class="stat-desc text-black underline">
    {$circlesBalances?.data?.length} individual tokens
  </a>
</div>
