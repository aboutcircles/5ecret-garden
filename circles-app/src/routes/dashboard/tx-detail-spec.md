Here’s a spec for the tx-detail view as we’ve ended up with it.

---

## 1. Data input

Source: `TransactionHistoryRow` (`item`).

Minimum fields used:

* `item.timestamp` – unix seconds or ms.
* `item.transactionHash`
* `item.from`, `item.to` – EVM addresses.
* `item.circles` – numeric amount in CRC (fallback only).
* `item.events` – either:

    * JSON string of an array of Circles events, or
    * already-parsed array.

Event shapes we care about:

* `CrcV2_TransferSingle`
* `CrcV2_TransferBatch` (not seen yet but supported generically via `Values[]`)
* `CrcV2_Erc20WrapperTransfer` (treated like a transfer)
* `CrcV2_DiscountCost`
* `CrcV2_StreamCompleted`
* Optional: other events just for the "Events" table.

---

## 2. Utilities / parsing

### 2.1 Address helpers

* `isAddress(v)` – `string` and `/^0x[0-9a-fA-F]{40}$/`.
* `ZERO_ADDRESS` – standard all-zero address.
* `isZeroAddress(addr)` – case-insensitive comparison with `ZERO_ADDRESS`.

### 2.2 Token-ID → avatar address

* `tokenIdKeys = { 'Id', 'TokenId', 'TokenID' }`.
* `tokenIdToAddressMaybe(key, value)`:

    * Only active if `key ∈ tokenIdKeys`.
    * Accepts `bigint`, `number`, decimal string, hex string.
    * Converts to `BigInt`, then `uint256ToAddress`.
    * Returns the address if it passes `isAddress`, else `null`.

Used to show the token’s “avatar” next to arrows and in event details.

### 2.3 BigInt / numeric conversions

* Constant `ATTO = 10n ** 18n`.
* `toBigIntMaybe(v)`:

    * Accepts `bigint`, finite `number`, decimal string, hex string.
    * Returns `BigInt` or `null`.
* `toCirclesNumber(v)`:

    * Uses `toBigIntMaybe`.
    * Interprets value as atto-CRC and returns `Number(abs(v)) / 1e18 * sign`.
    * If you pass a JS `number` directly, it’s treated as already in CRC (last-resort path).
* `normalizeTiny(v, eps = 1e-9)`:

    * If `|v| < eps`, returns `0` to kill float dust.
* We accept `Number` rounding error and explicitly normalize all nets with `normalizeTiny`.

    * Demurrage is additionally rounded to 2 decimals: `Math.round(net * 100) / 100`.

### 2.4 Safe stringify

* `safeStringify` handles:

    * `bigint` → string
    * `Map` / `Set`
    * circular references.

Used for JSON tab and event values.

---

## 3. Event parsing

* `events` derived:

    * If `item.events` is a string: `JSON.parse` and require array.
    * If it’s an array already: use as-is.
    * On failure: log warning, return `[]`.

---

## 4. Discount / protocol-cost detection

Goal: distinguish “protocol demurrage / fees” from “user-intended transfers”.

### 4.1 Aggregate DiscountCost

* Iterate all events.
* For each `CrcV2_DiscountCost`:

    * `account` = `Account` address (lowercased).
    * `id` = `Id` as raw value.
    * `cost` = `toBigIntMaybe(Cost)`.
    * Key = `account + '|' + String(id)`.
    * Aggregate into `discountCostByAccountAndId: Map<string, bigint>`.

### 4.2 Protocol-cost burns

`isProtocolCostBurn(ev: TxEvent)`:

* Only true for `CrcV2_TransferSingle` events where:

    * `From` is an address (lowercased), call it `account`.
    * `To` is zero address.
    * `Id` present.
    * `Value` convertible to `BigInt` (`value`).
    * There is a matching entry in `discountCostByAccountAndId` with same `(account, Id)`.
    * And its `cost === value`.
* This is how we mark burns that represent demurrage/discount, not economic transfers.

---

## 5. Transfer extraction

### 5.1 Transfer type

```ts
type Transfer = {
  from: string;          // lowercase address
  to: string;            // lowercase address
  amount: number;        // in CRC, from toCirclesNumber
  tokenAddress: string | null; // token “owner” address derived from Id
  isProtocolCost: boolean;     // from DiscountCost matching
};
```

### 5.2 Which events count as transfers?

* Event is considered transfer-like if:

    * `ev.$type` matches `/^CrcV2_Transfer/`, *or*
    * `ev.$type === 'CrcV2_Erc20WrapperTransfer'`.

### 5.3 Extract logic

For each transfer-like event:

* `from` = `asAddressMaybe(ev.From)` (lowercased).
* `to`   = `asAddressMaybe(ev.To)` (lowercased).
* Ignore if `from` or `to` missing, or `from === to`.
* `tokenAddress` = `tokenIdToAddressMaybe('Id', ev.Id)` or `null`.
* `isProtocolCost` = `isProtocolCostBurn(ev)`.

Then:

* If `Value` exists:

    * `amount = toCirclesNumber(ev.Value)` and push 1 transfer.
* Else if `Values` is an array:

    * `sum = Σ toCirclesNumber(v)` (ignoring `null`s).
    * If `sum != 0` push 1 transfer with that amount.

`transfers` is the flat list of all such `Transfer` objects for this tx.

---

## 6. Aggregated transfers (pairwise net)

### 6.1 Aggregation

We aggregate *all* transfers (including protocol cost) by unordered account pair:

* Map key: `min(from, to) + '|' + max(from, to)`.

* For each transfer `t`:

    * Get canonical pair `(a, b)` as sorted `(from, to)`.
    * Record `rec = { a, b, net, tokenAddress }`.
    * `delta = +t.amount` if `from === a`, else `-t.amount`.
    * `rec.net += delta`.
    * `rec.tokenAddress` is first non-null tokenAddress encountered.

* After all transfers:

    * For each record `{ a, b, net, tokenAddress }`:

        * `amt = |net|`.
        * If `amt <= 0`, drop.
        * If `net >= 0`: `from = a`, `to = b`;
          else: `from = b`, `to = a`.
        * Push `{ from, to, amount: amt, tokenAddress }`.

* Sort `aggregatedTransfers` by `amount` descending.

### 6.2 Non-burn vs burn

* `nonBurnTransfers` = `aggregatedTransfers` where `to != ZERO_ADDRESS`.
* `burnTransfers`    = `aggregatedTransfers` where `to == ZERO_ADDRESS`.
* `totalBurned`      = Σ `burnTransfers.amount`.

These aggregates are used only for the “Aggregated transfers” card, not for header net / demurrage.

---

## 7. Viewer-specific amounts

All viewer-centric numbers use `avatarState.avatar.address` (lowercased) as “me”.

### 7.1 Net intended transfer (excluding protocol-cost)

`netAmountForViewer`:

* Start `net = 0`.
* For each `Transfer t` where `!t.isProtocolCost`:

    * If `t.from === me`: `net -= t.amount`.
    * If `t.to   === me`: `net += t.amount`.
* Apply `normalizeTiny(net)`.

If there is no avatar loaded, this is `null`.

### 7.2 Demurrage / protocol cost

`demurrageAmount`:

* Start `net = 0`.
* For each `Transfer t` where `t.isProtocolCost`:

    * If `t.from === me`: `net -= t.amount`.
    * If `t.to   === me`: `net += t.amount`.
* Round to 2 decimals: `net = Math.round(net * 100) / 100`.
* `net = normalizeTiny(net)` (so silly float noise becomes 0).
* `demurrageAbs = |demurrageAmount|`.

Interpretation:

* For a normal user, demurrage should be **negative** (you lose value).
* We display it as a separate “-X CRC demurrage” line.

---

## 8. Header amount row

We no longer use `item.circles` directly unless we have no viewer.

### 8.1 Header net

* `headerNetAmount`:

    * If `netAmountForViewer` is non-null: use it.
    * Else fallback: `item.circles` coerced to number.

* Normalize:

    * Not additionally rounded; but header sign/format is based on `headerNetAmount` after `normalizeTiny` within `netAmountForViewer` (so viewer path is clean).
    * `headerAbsAmount = |headerNetAmount|`.
    * `headerSign = '-' if net < 0, '+' if net > 0, '' if net == 0`.
    * `signedAmount = headerSign + formatAmount(headerAbsAmount)`.

* Color:

    * `headerColorClass`:

        * `text-error` if `headerNetAmount < 0`.
        * `text-success` if `headerNetAmount > 0`.
        * `text-base-content` if exactly `0`.

### 8.2 Demurrage line

* Directly under the big amount, if `demurrageAbs > 0`:

    * Text: `-{formatAmount(demurrageAbs)} CRC demurrage`.
    * Styling: smaller font (`text-sm`), red (`text-error`), light label.

Interpretation:

* Big number = “intended transfers” (what you conceptually sent/received).
* Demurrage line = protocol fee / discount cost the user paid, separate.

---

## 9. Hero “From → To” diagram

This block has **no borders** and no separator line between amount and diagram.

General rule: **token avatar is always in front of the arrow in the direction of the arrow**.

### 9.1 Swap vs non-swap

We show either:

* a 2-row swap diagram (if `swapSummary` is set), or
* a single directional row with a “Direction” label (otherwise).

#### 9.1.1 Swap detection (`swapSummary`)

We detect a swap between `item.from` and `item.to`:

1. There must be at least one `CrcV2_StreamCompleted` event with:

    * `From == item.from`, `To == item.to` (case-insensitive).

2. Compute:

    * `totalOut`  = Σ `t.amount` for transfers where:

        * `t.from == item.from`, and
        * `!t.isProtocolCost` (ignore protocol-cost burns).

    * `totalIn`   = Σ `t.amount` for transfers where:

        * `t.from == item.to`, `t.to == item.from`.

    * `forwardTokenAddress` = first non-null tokenAddress from the forwards set.

    * `backwardTokenAddress` = first non-null tokenAddress from the backwards set.

3. Conditions:

    * `totalOut > 0` and `totalIn > 0`.
    * `net = totalIn - totalOut`.
    * If `|net| <= 1e-9`, treat as zero-sum ⇒ swap.

4. If swap:

   ```ts
   swapSummary = {
     forwardAmount: totalOut,
     backwardAmount: totalIn,
     forwardTokenAddress,
     backwardTokenAddress
   };
   ```

We **do not** currently display the numeric swap amounts in the header; they only influence the diagram and net.

#### 9.1.2 Swap diagram layout

If `swapSummary` is non-null:

* Row 1: **forward leg** (`item.from → item.to`)

    * Left: `Avatar` of `item.from` (horizontal with name).

    * Center: token then arrow:

      ```svelte
      {#if swapSummary.forwardTokenAddress}
        <Avatar address={swapSummary.forwardTokenAddress} view="small_no_text" />
      {/if}
      <Lucide icon={LArrowRight} />
      ```

    * Right: `Avatar` of `item.to` (horizontal with name).

* Row 2: **return leg** (`item.to → item.from`)

    * Left: `Avatar` of `item.from` (again).

    * Center: token then arrow (arrow rotated 180°):

      ```svelte
      {#if swapSummary.backwardTokenAddress}
        <Avatar address={swapSummary.backwardTokenAddress} view="small_no_text" />
      {/if}
      <div class="rotate-180">
        <Lucide icon={LArrowRight} />
      </div>
      ```

    * Right: `Avatar` of `item.to`.

This visually shows “forward token” and “return token” on the arrow path, with avatar in front of the arrow in the sense of flow.

#### 9.1.3 Directional (non-swap) diagram

If `swapSummary` is `null`:

* Single row:

    * Left: `Avatar` for `item.from`.

    * Center: token then arrow:

      ```svelte
      {#if mainTokenAddress}
        <Avatar address={mainTokenAddress()} view="small_no_text" />
      {/if}
      <Lucide icon={LArrowRight} />
      ```

    * Right: `Avatar` for `item.to`.

* Label row below:

    * Left text: `"Direction"`.
    * Right text: `"You sent this"` if `sent` is true; `"You received this"` otherwise.

`mainTokenAddress` is the token address of the first transfer where `from == item.from && to == item.to`.

---

## 10. Aggregated transfers card

This still shows the full event-level view (incl. protocol fees).

* Card: bordered, title `Aggregated transfers (N)` where `N = aggregatedTransfers.length`.

### 10.1 Non-burn rows

For each `t ∈ nonBurnTransfers`:

* Left cell:

    * If `t.from` is zero address: show minted icon:

      ```svelte
      <div class="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center" title="Minted">
        <Lucide icon={LCoins} size={14} class="text-success" />
      </div>
      ```

    * Else:

        * On small screens: `<Avatar view="small_no_text">` for `t.from`.
        * On ≥sm: `<Avatar view="small">` with label.

* Center: `formatAmount(t.amount) CRC`.

* Center-right: **token then arrow** (avatar in front of arrow):

  ```svelte
  {#if t.tokenAddress}
    <Avatar address={t.tokenAddress} view="small_no_text" />
  {/if}
  <div class="w-6 h-6 rounded-full bg-base-200/70 flex items-center justify-center">
    <Lucide icon={LArrowRight} size={16} />
  </div>
  ```

* Right cell:

    * On small: `<Avatar view="small_no_text">` for `t.to`.
    * On ≥sm: `<Avatar view="small_reverse">` (label then avatar).

### 10.2 Burns section

* If `burnTransfers.length > 0`:

    * A collapsible header row:

        * Left: `Burns (k)`.
        * Right: total burn amount `formatAmount(totalBurned()) CRC`.

    * Default: collapsed (`burnsOpen = false`).

* Inside expanded list, rows look like non-burn rows except:

    * Rightmost avatar replaced by flame icon:

      ```svelte
      <div class="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center" title="Burned">
        <Lucide icon={LFlame} size={14} class="text-error" />
      </div>
      ```

    * Center token+arrow is still token avatar then arrow.

---

## 11. Events card

* Collapsible card:

    * Header: `"Events (N)"` with arrow chevron rotating on open/close.
    * Clicking header or pressing Enter/Space toggles `eventsListOpen`.

* For each event:

    * Summary row:

        * Left: chevron + `{ev.$type ?? 'Event'} #i`.
        * Right: `"Log {LogIndex}"`.

    * Clicking toggles that event’s detail open/closed (`openEvents` set).

    * Details table when open:

        * Columns: Field | Value.
        * Keys filtered: hide `BlockNumber`, `Timestamp`, `TransactionIndex`, `TransactionHash`.
        * Keys sorted by `primaryOrder` then alphabetically.
        * Display rules:

            * If key is `'Value'` and `formatAttoCircles(v)` returns non-null: show CRC-formatted value.
            * Else if value is an address or token-ID convertible to address:

                * Show an inline `<Avatar>` for that address.
            * Else:

                * If `typeof v === 'object'`: `safeStringify(v, 0)`.
                * Else: `String(v)`.

---

## 12. JSON tab

* Second tab `JSON` shows:

    * Card with title `Transaction Data (JSON)` and “Copy JSON” button.
    * `<pre>` of `formattedJson()`.

---

## 13. UX / formatting rules

* Amounts:

    * All user-visible amounts are in CRC (scaled from atto).
    * Use `formatAmount`:

        * `< 0.01` → string `"< 0.01"`.
        * Otherwise `toFixed(2)`.

* Net-header amounts and demurrage use normalization:

    * Nets smaller than `1e-9` are treated as zero to avoid “dust” like `0.0000000001`.
    * Demurrage is rounded to 2 decimals before normalization.

* Avatar positioning:

    * **Rule**: token avatar should be **in front of** the arrow in the flow direction.
    * That is:

        * In forward diagrams: `token-avatar, then arrow →`.
        * In backward diagrams: `token-avatar, then arrow rotated 180°`.
        * In aggregated rows: `token-avatar` on the side of the arrow, always before it in the DOM/visual flow.

* Header block:

    * No border and no separator between the amount and the diagram.
    * Other cards (details table, aggregated transfers, events, JSON tab) are bordered.

That’s the full behavior we’ve implemented so far for the tx detail view.
