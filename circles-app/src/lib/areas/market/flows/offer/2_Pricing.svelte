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
  import type { Address } from '@circles-sdk/utils';
  import { T } from '$lib/design-system/tokens.js';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  let price            = $state(context.draft?.price ?? 0);
  let priceCurrency    = $state('CRC');
  let availableDeliveryMethod = $state(context.draft?.availableDeliveryMethod ?? '');
  let showRequirements = $state(false);
  const slotState = $state<Record<string, boolean>>(deriveRequiredSlotsState(context.draft?.requiredSlots));

  function isChecked(key: string): boolean { return Boolean(slotState[key]); }
  function toggleKey(key: string, checked: boolean): void { slotState[key] = checked; }
  function areAllChecked(keys: string[]): boolean { return keys.every((key) => Boolean(slotState[key])); }
  function toggleAll(keys: string[], checked: boolean): void { for (const key of keys) slotState[key] = checked; }
  function handleGroupToggle(keys: string[], event: Event): void {
    const target = event.currentTarget as HTMLInputElement | null;
    toggleAll(keys, Boolean(target?.checked));
  }
  function handleItemToggle(key: string, event: Event): void {
    const target = event.currentTarget as HTMLInputElement | null;
    toggleKey(key, Boolean(target?.checked));
  }

  let loadingGateways: boolean = $state(false);
  let gateways: string[] = $state([]);
  let selectedGateway: string = $state((context.draft?.paymentGateway as string) ?? '');

  async function loadMyGatewaysFor(owner: Address): Promise<void> {
    const c = get(circles);
    if (!owner || !c?.circlesRpc) { gateways = []; return; }
    try {
      loadingGateways = true;
      const rows = await fetchGatewayRowsByOwner(c, owner);
      gateways = rows.map((row) => row.gateway).filter((g) => g.length > 0).map((g) => g.toLowerCase());
      const current = (context.draft?.paymentGateway ?? '').toString().toLowerCase();
      if (current && gateways.includes(current)) selectedGateway = current;
      else if (gateways.length > 0) selectedGateway = gateways[0];
      else selectedGateway = '';
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
    if (!Number(price) || Number(price) <= 0) throw new Error('Price must be > 0.');
    if (!selectedGateway) throw new Error('Select a payment gateway.');

    context.draft = {
      ...context.draft!,
      price: Number(price),
      priceCurrency: 'CRC',
      paymentGateway: selectedGateway as unknown as Address,
      availableDeliveryMethod: availableDeliveryMethod || undefined,
      requiredSlots: computeRequiredSlotsFromSelections(slotState),
    };

    openStep({ title: 'Offer • Preview & Publish', component: OfferStep3, props: { context } });
  }

  function normalizeText(value: unknown): string {
    if (value == null) return '';
    return typeof value === 'string' ? value.trim() : String(value).trim();
  }

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

  const eyebrow = `font-size:10px;font-weight:600;color:${T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin:0 0 6px 2px;display:block;`;
  const inputStyle = `width:100%;padding:10px 14px;border:1px solid ${T.hairline};border-radius:10px;font-family:${T.fontSans};font-size:13px;color:${T.ink};background:${T.surface};box-sizing:border-box;`;
  const selectStyle = `width:100%;padding:10px 14px;border:1px solid ${T.hairline};border-radius:10px;font-family:${T.fontSans};font-size:13px;color:${T.ink};background:${T.surface};box-sizing:border-box;appearance:auto;`;
</script>

<FlowStepScaffold
  {...OFFER_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Pricing"
  subtitle="Define price, gateway, and checkout requirements."
>

<div style="display:flex;flex-direction:column;gap:14px;">
  <div>
    <span style={eyebrow}>Price (CRC)</span>
    <input style={inputStyle} type="number" step="0.01" min="0" bind:value={price} data-popup-initial-input />
  </div>

  <div>
    <span style={eyebrow}>Payment gateway</span>
    {#if loadingGateways}
      <div style="height:40px;border-radius:10px;background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};animation:pricing-skel 1.6s ease-in-out infinite;"></div>
    {:else if gateways.length === 0}
      <StepAlert variant="info">
        <span style="font-size:12.5px;">
          No gateways found.
          <a style="color:{T.primary};text-decoration:underline;" href="/settings?tab=payment" target="_blank">Create one</a>
          and come back.
        </span>
      </StepAlert>
    {:else}
      <PaymentGatewayDropdown options={gateways} bind:value={selectedGateway} ariaLabel="Select payment gateway" />
    {/if}
  </div>

  <div>
    <span style={eyebrow}>Delivery method (optional)</span>
    <select style={selectStyle} bind:value={availableDeliveryMethod}>
      <option value="">Not specified</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModePickUp">Pick up</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeOwnFleet">Own fleet</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeMail">Mail</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeFreight">Freight</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeDHL">DHL</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeUPS">UPS</option>
      <option value="http://purl.org/goodrelations/v1#DeliveryModeFedEx">FedEx</option>
    </select>
  </div>

  <!-- Checkout requirements (collapsible) -->
  <details style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:12px;overflow:hidden;">
    <summary style="padding:10px 14px;font-size:13px;font-weight:540;color:{T.ink};cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;">
      <span>Checkout requirements</span>
      <span style="font-size:11px;color:{T.inkMuted};">Optional</span>
    </summary>
    <div style="padding:0 14px 14px;display:flex;flex-direction:column;gap:14px;">
      {#each REQUIRED_SLOT_GROUPS as group (group.id)}
        <div style="display:flex;flex-direction:column;gap:8px;">
          <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
            <input
              type="checkbox"
              style="accent-color:{T.primary};width:14px;height:14px;cursor:pointer;"
              checked={areAllChecked(group.allKeys)}
              onchange={(event) => handleGroupToggle(group.allKeys, event)}
            />
            <span style="font-size:13px;font-weight:580;color:{T.ink};">{group.title}</span>
          </label>

          {#if group.layout === 'grid'}
            <div style="padding-left:20px;border-left:2px solid {T.hairlineSoft};display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
              {#each group.items as item (item.key)}
                <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
                  <input
                    type="checkbox"
                    style="accent-color:{T.primary};width:13px;height:13px;cursor:pointer;"
                    checked={isChecked(item.key)}
                    onchange={(event) => handleItemToggle(item.key, event)}
                    data-slot={item.slot}
                  />
                  <span style="font-size:12.5px;color:{T.ink};">{item.label}</span>
                  <span style="font-size:11px;color:{T.inkMuted};">({item.slot})</span>
                </label>
              {/each}
            </div>
          {:else}
            <div style="padding-left:20px;border-left:2px solid {T.hairlineSoft};display:flex;flex-direction:column;gap:6px;" role="tree" aria-label={group.treeLabel}>
              {#if group.parent}
                <div data-slot-node data-slot={group.parent.slot}>
                  <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
                    <input
                      type="checkbox"
                      style="accent-color:{T.primary};width:13px;height:13px;cursor:pointer;"
                      checked={isChecked(group.parent.key)}
                      onchange={(event) => handleGroupToggle(group.allKeys, event)}
                      data-slot={group.parent.slot}
                    />
                    <span style="font-size:12.5px;color:{T.ink};">{group.parent.label}</span>
                    <span style="font-size:11px;color:{T.inkMuted};">({group.parent.slot})</span>
                  </label>
                  <div style="padding-left:20px;border-left:2px solid {T.hairlineSoft};margin-top:6px;display:flex;flex-direction:column;gap:6px;" role="group" data-slot-children-of={group.parent.slot}>
                    {#each group.items as item (item.key)}
                      <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
                        <input
                          type="checkbox"
                          style="accent-color:{T.primary};width:13px;height:13px;cursor:pointer;"
                          checked={isChecked(item.key)}
                          onchange={(event) => handleItemToggle(item.key, event)}
                          data-slot={item.slot}
                          data-parent-slot={item.parentSlot}
                        />
                        <span style="font-size:12.5px;color:{T.ink};">{item.label}</span>
                        <span style="font-size:11px;color:{T.inkMuted};">({item.slot})</span>
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
  </details>

  <StepActionButtons primaryLabel="Continue" onPrimary={next} />
</div>

</FlowStepScaffold>

<style>
  summary::-webkit-details-marker { display: none; }
  @keyframes pricing-skel {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }
</style>
