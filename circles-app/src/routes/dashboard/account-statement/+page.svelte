<script lang="ts">
  import {avatar} from '$lib/stores/avatar';
  import {totalCirclesBalance} from '$lib/stores/totalCirclesBalance';
  import {roundToDecimals} from '$lib/utils/shared';
  import {onMount} from "svelte";

  // ------------ Types ------------
  type AccountStatementRow = {
    monthStart: string;
    tokenAddress: string;
    rawBalance: number;
    demurragedBalance: number;
    totalDemurrageSoFar: number;
    demurrageThisMonth: number;
  };

  type AggregatedData = {
    rows: AccountStatementRow[];
    rawBalanceSum: number;
    demurragedBalanceSum: number;
    totalDemurrageSoFarSum: number;
    demurrageThisMonthSum: number;
  };

  type YearTotals = Omit<AggregatedData, 'rows'>;

  type YearData = {
    year: number;
    totals: YearTotals;
    months: {
      month: number;
      agg: AggregatedData;
    }[];
  };

  // ------------ Component State ------------
  let accountStatement: AccountStatementRow[] = [];
  let groupedData: Map<number, Map<number, AggregatedData>> = new Map();
  let yearsData: YearData[] = [];

  onMount(getAccountStatement);

  // ------------ Fetch Logic ------------
  async function getAccountStatement() {
    if (!$avatar) return;

    const response = await fetch('http://localhost:8545/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'circles_getAccountStatement',
        params: [$avatar.address]
      })
    });
    const responseJson = await response.json();

    // Raw data in Wei
    accountStatement = responseJson.result ?? [];

    // Group, aggregate, and convert Wei -> ETH
    groupAndAggregate(accountStatement);
    // Build final array for easy rendering
    buildYearsData();
  }

  // ------------ Wei -> ETH Conversion ------------
  function fromWei(value: number | string): number {
    // If the value is a string, parse it; if it's a number, just use it directly.
    // This will lose precision for very large values, but is fine for normal UI display.
    const num = (typeof value === 'string')
      ? parseFloat(value)
      : value;
    return num / 1e18;
  }

  // ------------ Aggregation Logic ------------
  function groupAndAggregate(statements: AccountStatementRow[]) {
    // Clear old data
    groupedData = new Map();

    for (const row of statements) {
      const date = new Date(row.monthStart);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1; // 1-based

      // Convert row from Wei to ETH
      const raw = fromWei(row.rawBalance);
      const dem = fromWei(row.demurragedBalance);
      const soFar = fromWei(row.totalDemurrageSoFar);
      const thisMonth = fromWei(row.demurrageThisMonth);

      if (!groupedData.has(year)) {
        groupedData.set(year, new Map());
      }
      const monthlyMap = groupedData.get(year)!;

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          rows: [],
          rawBalanceSum: 0,
          demurragedBalanceSum: 0,
          totalDemurrageSoFarSum: 0,
          demurrageThisMonthSum: 0,
        });
      }

      const agg = monthlyMap.get(month)!;

      // Push a modified row, now in ETH
      agg.rows.push({
        ...row,
        rawBalance: raw,
        demurragedBalance: dem,
        totalDemurrageSoFar: soFar,
        demurrageThisMonth: thisMonth
      });

      // Also sum the ETH amounts
      agg.rawBalanceSum += raw;
      agg.demurragedBalanceSum += dem;
      agg.totalDemurrageSoFarSum += soFar;
      agg.demurrageThisMonthSum += thisMonth;
    }
  }

  // For a given year, sum all months to get year-level totals
  function getYearTotals(year: number): YearTotals {
    const months = groupedData.get(year);
    if (!months) {
      return {
        rawBalanceSum: 0,
        demurragedBalanceSum: 0,
        totalDemurrageSoFarSum: 0,
        demurrageThisMonthSum: 0,
      };
    }
    let raw = 0;
    let demurraged = 0;
    let soFar = 0;
    let thisMonth = 0;

    for (const agg of months.values()) {
      raw += agg.rawBalanceSum;
      demurraged += agg.demurragedBalanceSum;
      soFar += agg.totalDemurrageSoFarSum;
      thisMonth += agg.demurrageThisMonthSum;
    }
    return {
      rawBalanceSum: raw,
      demurragedBalanceSum: demurraged,
      totalDemurrageSoFarSum: soFar,
      demurrageThisMonthSum: thisMonth,
    };
  }

  // Build the final array for easy rendering in the <template>
  function buildYearsData() {
    yearsData = Array
      .from(groupedData.keys())
      .sort((a, b) => b - a) // descending
      .map(year => {
        const totals = getYearTotals(year);
        const monthsMap = groupedData.get(year)!;

        const months = Array
          .from(monthsMap.keys())
          .sort((a, b) => b - a) // descending
          .map(month => ({
            month,
            agg: monthsMap.get(month)!
          }));

        return {year, totals, months};
      });
  }

  // ------------ Utility ------------
  // Use a simple numeric formatter for the UI
  function fmt(value: number) {
    return value.toFixed(4); // e.g. 4 decimals for ETH
  }
</script>

<!-- Page Layout -->
<div class="w-full mb-4">
  <a href="/dashboard" class="inline-flex items-center gap-1">
    <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4"/>
    <span class="text-sm">Back</span>
  </a>
</div>

<div class="w-full flex flex-col md:flex-row justify-between md:items-end font-bold text-2xl mb-4 gap-y-1">
  <span>Account statement</span>
  <span class="text-sm font-medium text-gray-500 md:mr-8">
    {roundToDecimals($totalCirclesBalance)} CRC
  </span>
</div>

{#if accountStatement.length > 0}
  <!-- Loop over each year. All amounts are now in ETH. -->
  {#each yearsData as y}
    <details class="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box mb-2">
      <summary class="collapse-title text-lg font-bold flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <span>Year {y.year}</span>
        <span class="text-sm font-normal text-gray-600">
          | Raw: {fmt(y.totals.rawBalanceSum)}
          | Demurraged: {fmt(y.totals.demurragedBalanceSum)}
          | So Far: {fmt(y.totals.totalDemurrageSoFarSum)}
          | This Month: {fmt(y.totals.demurrageThisMonthSum)}
        </span>
      </summary>
      <div class="collapse-content px-4 py-2">
        {#each y.months as m}
          <details class="collapse collapse-arrow border border-base-200 bg-base-100 rounded-box my-2 ml-4">
            <summary class="collapse-title font-semibold flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span>Month {m.month}</span>
              <span class="text-sm font-normal text-gray-600">
                | Raw: {fmt(m.agg.rawBalanceSum)}
                | Demurraged: {fmt(m.agg.demurragedBalanceSum)}
                | So Far: {fmt(m.agg.totalDemurrageSoFarSum)}
                | This Month: {fmt(m.agg.demurrageThisMonthSum)}
              </span>
            </summary>
            <div class="collapse-content p-2">
              <div class="overflow-x-auto w-full mt-2 ml-4 max-h-80 overflow-y-auto">
                <table class="table table-zebra table-compact w-full relative">
                  <!-- Sticky table header -->
                  <thead class="sticky top-0 z-10 bg-base-100">
                  <tr>
                    <th>Token Address</th>
                    <th>Raw Bal (ETH)</th>
                    <th>Demurraged Bal (ETH)</th>
                    <th>Demurrage This Month (ETH)</th>
                    <th>Total Demurrage So Far (ETH)</th>
                    <th>Month Start</th>
                  </tr>
                  </thead>
                  <tbody>
                  {#each m.agg.rows as detailRow}
                    <tr>
                      <td>{detailRow.tokenAddress}</td>
                      <td>{fmt(detailRow.rawBalance)}</td>
                      <td>{fmt(detailRow.demurragedBalance)}</td>
                      <td>{fmt(detailRow.demurrageThisMonth)}</td>
                      <td>{fmt(detailRow.totalDemurrageSoFar)}</td>
                      <td>{detailRow.monthStart}</td>
                    </tr>
                  {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        {/each}
      </div>
    </details>
  {/each}
{/if}