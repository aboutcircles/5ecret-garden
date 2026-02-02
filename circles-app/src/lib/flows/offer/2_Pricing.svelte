<script lang="ts">
  import { popupControls } from '$lib/stores/popup';
  import OfferStep3 from './3_PreviewPublish.svelte';
  import type { OfferFlowContext } from './types';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { Address } from '@circles-sdk/utils';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  let price            = $state(context.draft?.price ?? 0);
  // Currency is fixed to CRC for this marketplace; keep state for draft but do not expose input
  let priceCurrency    = $state('CRC');
  let availableDeliveryMethod = $state(context.draft?.availableDeliveryMethod ?? '');
  // Collapsible toggle for Checkout requirements
  let showRequirements = $state(false);
  // Offer-driven basket requirements (requiredSlots)
  // Contact
  let reqEmail = $state(Boolean(context.draft?.requiredSlots?.includes('contactPoint.email')));
  let reqPhone = $state(Boolean(context.draft?.requiredSlots?.includes('contactPoint.telephone')));
  // Customer
  let reqCustomer = $state(Boolean(context.draft?.requiredSlots?.includes('customer')));
  // Age verification
  let reqAgeProof = $state(Boolean(context.draft?.requiredSlots?.includes('ageProof')));
  let reqBirthDate = $state(Boolean(context.draft?.requiredSlots?.includes('ageProof.birthDate')));
  // Shipping address (coarse and fine-grained)
  let reqShip = $state(Boolean(context.draft?.requiredSlots?.includes('shippingAddress')));
  let reqShipStreet = $state(Boolean(context.draft?.requiredSlots?.includes('shippingAddress.streetAddress')));
  let reqShipLocality = $state(Boolean(context.draft?.requiredSlots?.includes('shippingAddress.addressLocality')));
  let reqShipPostal = $state(Boolean(context.draft?.requiredSlots?.includes('shippingAddress.postalCode')));
  let reqShipCountry = $state(Boolean(context.draft?.requiredSlots?.includes('shippingAddress.addressCountry')));
  // Billing address (coarse and fine-grained)
  let reqBill = $state(Boolean(context.draft?.requiredSlots?.includes('billingAddress')));
  let reqBillStreet = $state(Boolean(context.draft?.requiredSlots?.includes('billingAddress.streetAddress')));
  let reqBillLocality = $state(Boolean(context.draft?.requiredSlots?.includes('billingAddress.addressLocality')));
  let reqBillPostal = $state(Boolean(context.draft?.requiredSlots?.includes('billingAddress.postalCode')));
  let reqBillCountry = $state(Boolean(context.draft?.requiredSlots?.includes('billingAddress.addressCountry')));

  function computeRequiredSlots(): string[] | undefined {
    const out: string[] = [];

    if (reqEmail) out.push('contactPoint.email');
    if (reqPhone) out.push('contactPoint.telephone');

    if (reqCustomer) out.push('customer');

    if (reqAgeProof) out.push('ageProof');
    if (reqBirthDate) out.push('ageProof.birthDate');

    if (reqShip) out.push('shippingAddress');
    if (reqShipStreet) out.push('shippingAddress.streetAddress');
    if (reqShipLocality) out.push('shippingAddress.addressLocality');
    if (reqShipPostal) out.push('shippingAddress.postalCode');
    if (reqShipCountry) out.push('shippingAddress.addressCountry');

    if (reqBill) out.push('billingAddress');
    if (reqBillStreet) out.push('billingAddress.streetAddress');
    if (reqBillLocality) out.push('billingAddress.addressLocality');
    if (reqBillPostal) out.push('billingAddress.postalCode');
    if (reqBillCountry) out.push('billingAddress.addressCountry');

    return out.length > 0 ? out : undefined;
  }

  // Group-level derived states and toggle helpers (tree behavior)
  const contactAll = $derived(reqEmail && reqPhone);
  const ageAll = $derived(reqAgeProof && reqBirthDate);
  const shipAll = $derived(
    reqShip && reqShipStreet && reqShipLocality && reqShipPostal && reqShipCountry
  );
  const billAll = $derived(
    reqBill && reqBillStreet && reqBillLocality && reqBillPostal && reqBillCountry
  );

  function setContactAll(v: boolean): void {
    reqEmail = v;
    reqPhone = v;
  }
  function setAgeAll(v: boolean): void {
    reqAgeProof = v;
    reqBirthDate = v;
  }
  function setShipAll(v: boolean): void {
    reqShip = v;
    reqShipStreet = v;
    reqShipLocality = v;
    reqShipPostal = v;
    reqShipCountry = v;
  }
  function setBillAll(v: boolean): void {
    reqBill = v;
    reqBillStreet = v;
    reqBillLocality = v;
    reqBillPostal = v;
    reqBillCountry = v;
  }

  // Payment gateway selection state
  let loadingGateways: boolean = $state(false);
  let gateways: string[] = $state([]);
  let selectedGateway: string = $state((context.draft?.paymentGateway as string) ?? '');

  async function loadMyGatewaysFor(owner: Address): Promise<void> {
    const c = get(circles);
    if (!owner || !c?.circlesRpc) {
      gateways = [];
      return;
    }
    try {
      loadingGateways = true;
      const resp = await c.circlesRpc.call<{ columns: string[]; rows: any[][] }>('circles_query', [
        {
          Namespace: 'CrcV2_PaymentGateway',
          Table: 'GatewayCreated',
          Columns: ['gateway'],
          Filter: [
            { Type: 'FilterPredicate', FilterType: 'Equals', Column: 'owner', Value: owner.toLowerCase() }
          ],
          Order: []
        }
      ]);
      const cols = resp?.result?.columns ?? [];
      const rows = resp?.result?.rows ?? [];
      const idxG = cols.indexOf('gateway');
      gateways = rows
        .map((r) => (r[idxG] ? (r[idxG] as string) : ''))
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
      requiredSlots: computeRequiredSlots(),
    };

    popupControls.open({
      title: 'Offer • Preview & Publish',
      component: OfferStep3,
      props: { context }
    });
  }

  // Persist form state into the shared draft reactively to avoid losing data when navigating back
  $effect(() => {
    context.draft = {
      ...context.draft!,
      price: Number(price) || undefined,
      priceCurrency: (priceCurrency ?? '').trim() || undefined,
      paymentGateway: asAddress((selectedGateway ?? '').trim() || undefined),
      availableDeliveryMethod: (availableDeliveryMethod ?? '').trim() || undefined,
      requiredSlots: computeRequiredSlots(),
    };
  });
</script>

<div class="space-y-3">
  <!-- Price row: currency fixed to CRC -->
  <label class="form-control">
    <span class="label-text">Price (CRC)</span>
    <input class="input input-bordered" type="number" step="0.01" min="0" bind:value={price} />
  </label>

  <!-- Payment gateway row -->
  <div class="form-control">
    <div class="label">
      <span class="label-text">Payment gateway</span>
    </div>
    {#if loadingGateways}
      <div class="opacity-70 text-sm">Loading…</div>
    {:else if gateways.length === 0}
      <div class="opacity-70 text-sm">No gateways found. <a class="link" href="/settings?tab=payment" target="_blank">Create one</a> and come back.</div>
    {:else}
      <!-- Custom dropdown to show Avatar names -->
      <div class="dropdown">
        <div tabindex="0" role="button" class="btn btn-outline justify-start">
          <Avatar address={asAddress(selectedGateway)} view="horizontal" bottomInfo={selectedGateway} clickable={false} />
        </div>
        <ul class="dropdown-content menu bg-base-100 rounded-box z-[1] w-72 p-2 shadow">
          {#each gateways as gw}
            <li>
              <button type="button" class="flex items-center gap-2" onclick={() => { selectedGateway = gw; }}>
                <Avatar address={asAddress(gw)} view="horizontal" bottomInfo={gw} clickable={false} />
              </button>
            </li>
          {/each}
        </ul>
      </div>
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
    <div class="collapse-content">
      <!-- Customer identification group -->
      <div class="space-y-2">
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox" bind:checked={reqCustomer} />
          <span class="label-text font-semibold">Customer identification</span>
        </label>
        <div class="pl-6 border-l border-base-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqCustomer} data-slot="customer" />
            <span class="label-text">Require buyer first and last name</span>
            <span class="label-text-alt opacity-70">(customer)</span>
          </label>
        </div>
      </div>

      <!-- Contact group -->
      <div class="space-y-2">
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox" checked={contactAll} onchange={(e) => setContactAll((e.target).checked)} />
          <span class="label-text font-semibold">Contact</span>
        </label>
        <div class="pl-6 border-l border-base-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqEmail} data-slot="contactPoint.email" />
            <span class="label-text">Require buyer email at checkout</span>
            <span class="label-text-alt opacity-70">(contactPoint.email)</span>
          </label>
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqPhone} data-slot="contactPoint.telephone" />
            <span class="label-text">Require buyer phone at checkout</span>
            <span class="label-text-alt opacity-70">(contactPoint.telephone)</span>
          </label>
        </div>
      </div>

      <!-- Age verification group -->
      <div class="mt-3 space-y-2">
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox" checked={ageAll} onchange={(e) => setAgeAll((e.target).checked)} />
          <span class="label-text font-semibold">Age verification</span>
        </label>
        <div class="pl-6 border-l border-base-200 space-y-2" role="tree" aria-label="Age verification slots">
          <!-- Object parent: ageProof -->
          <div data-slot-node data-slot="ageProof">
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                bind:checked={reqAgeProof}
                onchange={(e) => setAgeAll((e.target).checked)}
                data-slot="ageProof"
              />
              <span class="label-text">Require age proof object</span>
              <span class="label-text-alt opacity-70">(ageProof)</span>
            </label>
            <!-- Children of ageProof -->
            <div class="pl-6 border-l border-base-200 space-y-2" role="group" data-slot-children-of="ageProof">
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  bind:checked={reqBirthDate}
                  data-slot="ageProof.birthDate"
                  data-parent-slot="ageProof"
                />
                <span class="label-text">Require date of birth</span>
                <span class="label-text-alt opacity-70">(ageProof.birthDate)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Shipping address group -->
      <div class="mt-3 space-y-2">
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox" checked={shipAll} onchange={(e) => setShipAll((e.target).checked)} />
          <span class="label-text font-semibold">Shipping address</span>
        </label>
        <div class="pl-6 border-l border-base-200 space-y-2" role="tree" aria-label="Shipping address slots">
          <!-- Object parent: shippingAddress -->
          <div data-slot-node data-slot="shippingAddress">
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                bind:checked={reqShip}
                onchange={(e) => setShipAll((e.target).checked)}
                data-slot="shippingAddress"
              />
              <span class="label-text">Require shipping address object</span>
              <span class="label-text-alt opacity-70">(shippingAddress)</span>
            </label>
            <!-- Children of shippingAddress -->
            <div class="pl-6 border-l border-base-200 grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" data-slot-children-of="shippingAddress">
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqShipStreet} data-slot="shippingAddress.streetAddress" data-parent-slot="shippingAddress" />
                <span class="label-text">Require shipping street address</span>
                <span class="label-text-alt opacity-70">(shippingAddress.streetAddress)</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqShipLocality} data-slot="shippingAddress.addressLocality" data-parent-slot="shippingAddress" />
                <span class="label-text">Require shipping city/locality</span>
                <span class="label-text-alt opacity-70">(shippingAddress.addressLocality)</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqShipPostal} data-slot="shippingAddress.postalCode" data-parent-slot="shippingAddress" />
                <span class="label-text">Require shipping postal code</span>
                <span class="label-text-alt opacity-70">(shippingAddress.postalCode)</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqShipCountry} data-slot="shippingAddress.addressCountry" data-parent-slot="shippingAddress" />
                <span class="label-text">Require shipping country</span>
                <span class="label-text-alt opacity-70">(shippingAddress.addressCountry)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Billing address group -->
      <div class="mt-3 space-y-2">
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox" checked={billAll} onchange={(e) => setBillAll((e.target).checked)} />
          <span class="label-text font-semibold">Billing address</span>
        </label>
        <div class="pl-6 border-l border-base-200 space-y-2" role="tree" aria-label="Billing address slots">
          <!-- Object parent: billingAddress -->
          <div data-slot-node data-slot="billingAddress">
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                bind:checked={reqBill}
                onchange={(e) => setBillAll((e.target).checked)}
                data-slot="billingAddress"
              />
              <span class="label-text">Require billing address object</span>
              <span class="label-text-alt opacity-70">(billingAddress)</span>
            </label>
            <!-- Children of billingAddress -->
            <div class="pl-6 border-l border-base-200 grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" data-slot-children-of="billingAddress">
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqBillStreet} data-slot="billingAddress.streetAddress" data-parent-slot="billingAddress" />
                <span class="label-text">Require billing street address</span>
                <span class="label-text-alt opacity-70">(billingAddress.streetAddress)</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqBillLocality} data-slot="billingAddress.addressLocality" data-parent-slot="billingAddress" />
                <span class="label-text">Require billing city/locality</span>
                <span class="label-text-alt opacity-70">(billingAddress.addressLocality)</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqBillPostal} data-slot="billingAddress.postalCode" data-parent-slot="billingAddress" />
                <span class="label-text">Require billing postal code</span>
                <span class="label-text-alt opacity-70">(billingAddress.postalCode)</span>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={reqBillCountry} data-slot="billingAddress.addressCountry" data-parent-slot="billingAddress" />
                <span class="label-text">Require billing country</span>
                <span class="label-text-alt opacity-70">(billingAddress.addressCountry)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-4 flex justify-end">
    <button type="button" class="btn btn-primary" onclick={next}>Next</button>
  </div>
</div>
