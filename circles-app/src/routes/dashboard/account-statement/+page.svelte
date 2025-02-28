<script lang="ts">
  import { avatar } from '$lib/stores/avatar';

  // --- Interfaces ---
  interface DailyLedgerRow {
    UtcDate: string; // e.g. "2025-02-15T00:00:00Z"
    DayIndex: number;
    V1Balance: number;
    V2InflationaryBalance: number;
    V2DemurragedBalance: number;
    V2DemurrageBurned: number;
  }

  // For holding both the sign-formatted string & a CSS class
  interface DeltaProps {
    formatted: string;
    cssClass: string;
  }

  interface MonthlyGroup {
    year: number;
    month: number;
    daily: DailyLedgerRow[];
    totalDemurrageBurned: number;
    endV1: number;
    endV2Infl: number;
    endV2Dem: number;
    startV1: number;
    startV2Infl: number;
    startV2Dem: number;

    // We'll attach these computed properties:
    v1Delta?: DeltaProps;
    v2InflDelta?: DeltaProps;
    v2DemDelta?: DeltaProps;
  }

  // This is our user-selected address
  let address = $avatar?.address ?? "";

  // --- Utility functions ---

  function parseDateString(dateStr: string): Date {
    return new Date(dateStr);
  }

  // Returns a CSS class for positive/negative/zero
  function colorClass(num: number): string {
    if (num > 0) return "text-green-500";
    if (num < 0) return "text-red-500";
    return "text-gray-500";
  }

  // Returns a string like "+1.2345" or "-0.9876"
  function formatDelta(num: number): string {
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toFixed(4)}`;
  }

  // Combines both of the above, so you only call this once
  function getDeltaProps(end: number, start: number): DeltaProps {
    const delta = end - start;
    return {
      formatted: formatDelta(delta),
      cssClass: colorClass(delta),
    };
  }

  // --- Data fetching + grouping ---

  async function groupedByMonth(addr: string): Promise<MonthlyGroup[]> {
    // 1. Fetch daily rows
    const dailyRows: DailyLedgerRow[] = await fetch(
      `http://localhost:8080/account-statement/${addr}`
    )
      .then(resp => resp.json())
      .then(data => data as DailyLedgerRow[]);

    // 2. Sort by date
    const sorted = [...dailyRows].sort((a, b) => {
      return parseDateString(a.UtcDate).getTime() - parseDateString(b.UtcDate).getTime();
    });

    // 3. Group into year-month
    const map = new Map<string, DailyLedgerRow[]>();
    for (const row of sorted) {
      const d = parseDateString(row.UtcDate);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const key = `${y}-${m}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(row);
    }

    // 4. Build MonthlyGroup objects
    const result: MonthlyGroup[] = [];
    for (const [key, daily] of map.entries()) {
      const [yStr, mStr] = key.split("-");
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);

      // Sum demurrage
      let totalDemurrage = 0;
      daily.forEach(d => {
        totalDemurrage += d.V2DemurrageBurned;
      });

      // Start and end-of-month
      const firstDay = daily[0];
      const lastDay = daily[daily.length - 1];

      const group: MonthlyGroup = {
        year,
        month,
        daily,
        totalDemurrageBurned: totalDemurrage,

        endV1: lastDay.V1Balance,
        endV2Infl: lastDay.V2InflationaryBalance,
        endV2Dem: lastDay.V2DemurragedBalance,

        startV1: firstDay.V1Balance,
        startV2Infl: firstDay.V2InflationaryBalance,
        startV2Dem: firstDay.V2DemurragedBalance,
      };

      // Precompute deltas (v1Delta, v2InflDelta, v2DemDelta)
      group.v1Delta = getDeltaProps(group.endV1, group.startV1);
      group.v2InflDelta = getDeltaProps(group.endV2Infl, group.startV2Infl);
      group.v2DemDelta = getDeltaProps(group.endV2Dem, group.startV2Dem);

      result.push(group);
    }

    // 5. Sort final array by year, then month
    result.sort((a, b) => {
      if (a.year === b.year) {
        return a.month - b.month;
      }
      return a.year - b.year;
    });

    return result;
  }
</script>

<!-- Address input -->
<div class="p-4 mt-24">
  <label for="addressInput" class="mr-2">Enter Address:</label>
  <input
      id="addressInput"
      type="text"
      bind:value={address}
      class="border rounded px-2 py-1"
  />
</div>

<!-- Render fetched data -->
<div class="p-4 space-y-4 mt-4">
  {#await groupedByMonth(address) then groups}
    {#each groups as group}
      <div class="collapse collapse-arrow bg-base-200 rounded-box">
        <input type="checkbox" />

        <!-- Collapsible header -->
        <div class="collapse-title text-lg font-medium">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-xl font-semibold">
              {group.year}-{group.month.toString().padStart(2, "0")}
            </div>

            <!-- Aggregated stats -->
            <div class="flex flex-wrap gap-4 text-sm">
              <div>
                <span class="text-gray-500">Total Demurrage Burned:</span>
                <span class="font-semibold">{group.totalDemurrageBurned.toFixed(4)}</span>
              </div>
              <div>
                <span class="text-gray-500">End-of-month V1:</span>
                <span class="font-semibold">{group.endV1.toFixed(4)}</span>
              </div>
              <div>
                <span class="text-gray-500">End-of-month V2 Infl:</span>
                <span class="font-semibold">{group.endV2Infl.toFixed(4)}</span>
              </div>
              <div>
                <span class="text-gray-500">End-of-month V2 Dem:</span>
                <span class="font-semibold">{group.endV2Dem.toFixed(4)}</span>
              </div>
            </div>

            <!-- Net change block -->
            <div class="flex flex-wrap gap-4 text-sm">
              <div>
                <span class="text-gray-500">V1 Change:</span>
                <span class={group.v1Delta.cssClass}>
                  {group.v1Delta.formatted}
                </span>
              </div>

              <div>
                <span class="text-gray-500">V2 Infl Change:</span>
                <span class={group.v2InflDelta.cssClass}>
                  {group.v2InflDelta.formatted}
                </span>
              </div>

              <div>
                <span class="text-gray-500">V2 Dem Change:</span>
                <span class={group.v2DemDelta.cssClass}>
                  {group.v2DemDelta.formatted}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Collapsible content (the daily table) -->
        <div class="collapse-content">
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
              <tr>
                <th class="text-left">Date (UTC)</th>
                <th class="text-right">V1 Balance</th>
                <th class="text-right">V2 Infl. Balance</th>
                <th class="text-right">V2 Dem. Balance</th>
                <th class="text-right">Demurrage Burned</th>
              </tr>
              </thead>
              <tbody>
              {#each group.daily as d}
                <tr>
                  <td class="text-left">
                    {new Date(d.UtcDate).toISOString().slice(0, 10)}
                  </td>
                  <td class="text-right">{d.V1Balance.toFixed(6)}</td>
                  <td class="text-right">{d.V2InflationaryBalance.toFixed(6)}</td>
                  <td class="text-right">{d.V2DemurragedBalance.toFixed(6)}</td>
                  <td class="text-right">{d.V2DemurrageBurned.toFixed(6)}</td>
                </tr>
              {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/each}
  {:catch error}
    <div class="text-red-500">
      Error fetching data: {error.message}
    </div>
  {/await}
</div>
