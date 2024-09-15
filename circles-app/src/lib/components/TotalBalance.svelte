<script>
import {balances} from "$lib/stores/balances";
import {totalCirclesBalance} from "$lib/stores/totalCirclesBalance";
import {floorToDecimals} from "$lib/utils/shared";
</script>
<div class="stats text-center">
    <div class="stat">
        <a href="/_new/dashboard/balances">
            <div class="stat-value">{floorToDecimals($totalCirclesBalance)} Circles</div>
            <div class="stat-desc">{$balances?.data?.length} individual tokens</div>
        </a>
    </div>
</div>