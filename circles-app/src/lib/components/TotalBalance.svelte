<script>
import {circlesBalances} from "$lib/stores/circlesBalances";
import {totalCirclesBalance} from "$lib/stores/totalCirclesBalance";
import {roundToDecimals} from "$lib/utils/shared";
</script>
<div class="stats text-center">
    <div class="stat">
        <a href="/_new/dashboard/balances">
            <div class="stat-value">{roundToDecimals($totalCirclesBalance)} Circles</div>
            <div class="stat-desc underline">{$circlesBalances?.data?.length} individual tokens</div>
        </a>
    </div>
</div>