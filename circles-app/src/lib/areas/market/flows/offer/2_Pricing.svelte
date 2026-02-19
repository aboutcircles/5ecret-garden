<script lang="ts">
  import { openStep } from '$lib/shared/flow';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
  import { OFFER_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import PaymentGatewayDropdown from './PaymentGatewayDropdown.svelte';
  import OfferStep3 from './3_PreviewPublish.svelte';
  import type { OfferFlowContext } from './types';
  import {
    REQUIRED_SLOT_GROUPS,
    deriveRequiredSlotsState,
    computeRequiredSlotsFromSelections
  } from '$lib/areas/market/flows/checkout/requiredSlots';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { circles } from '$lib/shared/state/circles';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { fetchGatewayRowsByOwner } from '$lib/shared/data/circles/paymentGateways';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  // svelte-ignore state_referenced_locally
  let price            = $state(context.draft?.price ?? 0);
  // Currency is fixed to CRC for this marketplace; keep state for draft but do not expose input
  let priceCurrency    = $state('CRC');
  // svelte-ignore state_referenced_locally
  let availableDeliveryMethod = $state(context.draft?.availableDeliveryMethod ?? '');
  // Collapsible toggle for Checkout requirements
  let showRequirements = $state(false);
  // Offer-driven basket requirements (requiredSlots)
  // svelte-ignore state_referenced_locally
  const slotState = $state<Record<string, boolean>>(deriveRequiredSlotsState(context.draft?.requiredSlots));

  function isChecked(key: string): boolean {
    return Boolean(slotState[key]);
  }

  function toggleKey(key: string, checked: boolean): void {
    slotState[key] = checked;
  }

  function areAllChecked(keys: string[]): boolean {
    return keys.every((key) => Boolean(slotState[key]));
  }

  function toggleAll(keys: string[], checked: boolean): void {
    for (const key of keys) {
      slotState[key] = checked;
    }
  }

  function handleGroupToggle(keys: string[], event: Event): void {
    const target = event.currentTarget as HTMLInputElement | null;
    toggleAll(keys, Boolean(target?.checked));
  }

  function handleItemToggle(key: string, event: Event): void {
    const target = event.currentTarget as HTMLInputElement | null;
    toggleKey(key, Boolean(target?.checked));
  }


  // Payment gateway selection state
  let loadingGateways: boolean = $state(false);
  let gateways: string[] = $state([]);
  // svelte-ignore state_referenced_locally
  let selectedGateway: string = $state((context.draft?.paymentGateway as string) ?? '');

  async function loadMyGatewaysFor(owner: Address): Promise<void> {
    const c = get(circles);
    if (!owner || !c?.rpc) {
      gateways = [];
      return;
    }
    try {
      loadingGateways = true;
      const rows = await fetchGatewayRowsByOwner(c, owner);
      gateways = rows
        .map((row) => row.gateway)
        .filter((g) => g.length > 0)
        .map((g) => g.toLowerCase());

      // Preselect existing draft gateway or the first one
      const current = (context.draft?.paymentGateway ?? '').toString().toLowerCase();
      if (current && gateways.includes(current)) {
        selectedGateway = current;
      } else if (gateways.length > 0) {
        selectedGateway = gateways[0];
      } else {
        selectedGateway = '';
      }
    } catch (e) {
      console.error('loadMyGatewaysFor', e);
      gateways = [];
      selectedGateway = '';
    } finally {
      loadingGateways = false;
    }
  }

  onMount(async () => {
    const walletVal = get(wallet);
    const sellerRaw = walletVal?.address as Address | undefined;
    if (sellerRaw) await loadMyGatewaysFor(sellerRaw as Address);
  });

  function asAddress(s: string | undefined): Address | undefined { return s as unknown as Address; }

  function next(): void {
    const priceOk = Number(price) > 0;
    const gwOk = !!selectedGateway;

    if (!priceOk) { throw new Error('Price must be > 0.'); }
    if (!gwOk) { throw new Error('Select a payment gateway.'); }

    context.draft = {
      ...context.draft!,
      price: Number(price),
      priceCurrency: 'CRC',
      paymentGateway: selectedGateway as unknown as Address,
      availableDeliveryMethod: availableDeliveryMethod || undefined,
      requiredSlots: computeRequiredSlotsFromSelections(slotState),
    };

    openStep({
      title: 'Offer • Preview & Publish',
      component: OfferStep3,
      props: { context }
    });
  }

  function normalizeText(value: unknown): string {
    if (value == null) return '';
    return typeof value === 'string' ? value.trim() : String(value).trim();
  }

  // Persist form state into the shared draft reactively to avoid losing data when navigating back
  $effect(() => {
    context.draft = {
      ...context.draft!,
      price: Number(price) || undefined,
      priceCurrency: normalizeText(priceCurrency) || undefined,
      paymentGateway: asAddress(normalizeText(selectedGateway) || undefined),
      availableDeliveryMethod: normalizeText(availableDeliveryMethod) || undefined,
      requiredSlots: computeRequiredSlotsFromSelections(slotState),
    };
  });
</script>

<FlowStepScaffold
  {...OFFER_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Pricing"
  subtitle="Define price, gateway, and checkout requirements."
>

<div class="space-y-3">
  <!-- Price row: currency fixed to CRC -->
  <label class="form-control">
    <span class="label-text">Price (CRC)</span>
    <input class="input input-bordered" type="number" step="0.01" min="0" bind:value={price} data-popup-initial-input />
  </label>

  <!-- Payment gateway row -->
  <div class="form-control">
    <div class="label">
      <span class="label-text">Payment gateway</span>
    </div>
    {#if loadingGateways}
      <div class="opacity-70 text-sm">Loading…</div>
    {:else if gateways.length === 0}
      <StepAlert variant="info">
        <span class="text-sm">
          No gateways found.
          <a class="link ml-1" href="/settings?tab=payment" target="_blank">Create one</a>
          and come back.
        </span>
      </StepAlert>
    {:else}
      <PaymentGatewayDropdown
        options={gateways}
        bind:value={selectedGateway}
        ariaLabel="Select payment gateway"
      />
    {/if}
  </div>

  <!-- Delivery method row -->
  <label class="form-control">
    <span class="label-text">Delivery method (optional)</span>
    <select class="select select-bordered" bind:value={availableDeliveryMethod}>
      <option value="">Not specified</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModePickUp">Pick up</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeOwnFleet">Own fleet</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeMail">Mail</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeFreight">Freight</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeDHL">DHL</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeUPS">UPS</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeFedEx">FedEx</option>
    </select>
  </label>

  <!-- Offer-driven basket requirements (collapsible) -->
  <div class="collapse bg-base-200 mt-2">
    <input type="checkbox" bind:checked={showRequirements} />
    <div class="collapse-title text-md font-medium">Checkout requirements</div>
    <div class="collapse-content space-y-3">
      {#each REQUIRED_SLOT_GROUPS as group (group.id)}
        <div class={group.layout === 'tree' ? 'mt-3 space-y-2' : 'space-y-2'}>
          <label class="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              class="checkbox"
              checked={areAllChecked(group.allKeys)}
              onchange={(event) => handleGroupToggle(group.allKeys, event)}
            />
            <span class="label-text font-semibold">{group.title}</span>
          </label>

          {#if group.layout === 'grid'}
            <div class="pl-6 border-l border-base-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {#each group.items as item (item.key)}
                <label class="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={isChecked(item.key)}
                    onchange={(event) => handleItemToggle(item.key, event)}
                    data-slot={item.slot}
                  />
                  <span class="label-text">{item.label}</span>
                  <span class="label-text-alt opacity-70">({item.slot})</span>
                </label>
              {/each}
            </div>
          {:else}
            <div class="pl-6 border-l border-base-200 space-y-2" role="tree" aria-label={group.treeLabel}>
              {#if group.parent}
                <div data-slot-node data-slot={group.parent.slot}>
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={isChecked(group.parent.key)}
                      onchange={(event) => handleGroupToggle(group.allKeys, event)}
                      data-slot={group.parent.slot}
                    />
                    <span class="label-text">{group.parent.label}</span>
                    <span class="label-text-alt opacity-70">({group.parent.slot})</span>
                  </label>
                  <div
                    class="pl-6 border-l border-base-200 space-y-2"
                    role="group"
                    data-slot-children-of={group.parent.slot}
                  >
                    {#each group.items as item (item.key)}
                      <label class="label cursor-pointer justify-start gap-2">
                        <input
                          type="checkbox"
                          class="checkbox checkbox-sm"
                          checked={isChecked(item.key)}
                          onchange={(event) => handleItemToggle(item.key, event)}
                          data-slot={item.slot}
                          data-parent-slot={item.parentSlot}
                        />
                        <span class="label-text">{item.label}</span>
                        <span class="label-text-alt opacity-70">({item.slot})</span>
                      </label>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

    <StepActionButtons primaryLabel="Continue" onPrimary={next} />
</div>

</FlowStepScaffold>
