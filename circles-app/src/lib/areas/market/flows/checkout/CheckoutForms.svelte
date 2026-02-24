<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { openStep, useAsyncAction } from '$lib/shared/flow';
  import {
    cartState,
    updateBasketDetails,
    validateCart,
    previewCartOrder
  } from '$lib/areas/market/cart/store';
  import { deriveFormRequirements } from '$lib/areas/market/flows/checkout/requiredSlots';
  import CheckoutReview from './CheckoutReview.svelte';

  // This component shows only the address/details step.

  const validateAction = useAsyncAction(async () => {
    await persistDetails();
    await validateCart();
  });

  const submitAction = useAsyncAction(async () => {
    validateAction.reset();
    await persistDetails();
    const v = await validateCart();
    if (needsShippingFromValidation(v) || hasBlockingUnmet(v)) {
      throw new Error('Please fill in all required fields.');
    }
    await previewCartOrder();
    openStep({
      title: 'Review',
      component: CheckoutReview,
      props: {}
    });
  });

  // Local form state, hydrated once from the basket
  let shippingStreet = $state('');
  let shippingLocality = $state('');
  let shippingPostal = $state('');
  let shippingCountry = $state('');
  // Billing
  let billingStreet = $state('');
  let billingLocality = $state('');
  let billingPostal = $state('');
  let billingCountry = $state('');
  let contactEmail = $state('');
  let contactPhone = $state('');
  let birthDate = $state('');
  let givenName = $state('');
  let familyName = $state('');
  let skipNextBlurValidation = $state(false);

  let formInitialised = $state(false);

  // One-time hydration from the basket
  $effect(() => {
    if (formInitialised) {
      return;
    }
    const b = $cartState.basket;
    if (!b) {
      return;
    }

    const addr = b.shippingAddress as any;
    shippingStreet = (addr?.streetAddress as string) ?? '';
    shippingLocality = (addr?.addressLocality as string) ?? '';
    shippingPostal = (addr?.postalCode as string) ?? '';
    shippingCountry = (addr?.addressCountry as string) ?? '';

    const bill = b.billingAddress as any;
    billingStreet = (bill?.streetAddress as string) ?? '';
    billingLocality = (bill?.addressLocality as string) ?? '';
    billingPostal = (bill?.postalCode as string) ?? '';
    billingCountry = (bill?.addressCountry as string) ?? '';

    const contact = b.contactPoint as any;
    contactEmail = (contact?.email as string) ?? '';
    contactPhone = (contact?.telephone as string) ?? '';

    const age = b.ageProof as any;
    birthDate = (age?.birthDate as string) ?? '';

    const customer = b.customer as any;
    givenName = (customer?.givenName as string) ?? '';
    familyName = (customer?.familyName as string) ?? '';

    formInitialised = true;
  });

  async function persistDetails(): Promise<void> {
    const patch: any = {};

    // Only send objects when user provided something or when currently required
    const shipGroupRequired = shippingRequired;
    if (
      shipGroupRequired ||
      shippingStreet ||
      shippingLocality ||
      shippingPostal ||
      shippingCountry
    ) {
      patch.shippingAddress = {
        '@type': 'PostalAddress',
        streetAddress: shippingStreet || null,
        addressLocality: shippingLocality || null,
        postalCode: shippingPostal || null,
        addressCountry: shippingCountry || null
      };
    }

    if (contactEmail || contactPhone) {
      patch.contactPoint = {
        '@type': 'ContactPoint',
        email: contactEmail || null,
        telephone: contactPhone || null
      };
    }

    if (birthDate) {
      patch.ageProof = {
        '@type': 'Person',
        birthDate
      };
    }

    if (givenName || familyName) {
      patch.customer = {
        '@type': 'Person',
        givenName: givenName || null,
        familyName: familyName || null
      };
    }

    const billGroupRequired = billingRequired;
    if (
      billGroupRequired ||
      billingStreet ||
      billingLocality ||
      billingPostal ||
      billingCountry
    ) {
      patch.billingAddress = {
        '@type': 'PostalAddress',
        streetAddress: billingStreet || null,
        addressLocality: billingLocality || null,
        postalCode: billingPostal || null,
        addressCountry: billingCountry || null
      };
    }

    await updateBasketDetails(patch);
  }

  async function validateOnBlur(event?: FocusEvent): Promise<void> {
    const next = event?.relatedTarget as HTMLElement | null;
    if (next?.dataset?.skipBlurValidation === 'true' && skipNextBlurValidation) {
      skipNextBlurValidation = false;
      return;
    }
    skipNextBlurValidation = false;
    await validateAction.run();
  }

  function markSkipNextBlurValidation(): void {
    skipNextBlurValidation = true;
  }

  // True if the current validation result says shipping address is still required
  function needsShippingFromValidation(v: any): boolean {
    if (!v || !Array.isArray(v.requirements)) {
      return false;
    }
    return v.requirements.some(
      (r: any) =>
        (r.slot ?? '') === 'shippingAddress' &&
        (r.status ?? '').toString() != 'ok'
    );
  }

  // ————————————————————————————————————————————
  // Offer-driven required slots support (contactPoint.email / telephone)
  // ————————————————————————————————————————————
  function basketRequiredSlotsFromOffers(): Set<string> {
    const out = new Set<string>();
    const items = $cartState.basket?.items ?? [];
    for (const it of items) {
      const slots = (it as any)?.offerSnapshot?.requiredSlots as unknown;
      if (Array.isArray(slots)) {
        for (const s of slots) {
          const key = typeof s === 'string' ? s.trim() : '';
          if (key) out.add(key);
        }
      }
    }
    return out;
  }

  function requiredSlotsFromValidation(v: any): Set<string> {
    const out = new Set<string>();
    if (!v || !Array.isArray(v.requirements)) return out;
    for (const r of v.requirements) {
      const status = (r?.status ?? '').toString();
      const blocking = !!(r as any)?.blocking;
      const slot = (r?.slot ?? '').toString();
      if (blocking && status !== 'ok' && slot) {
        out.add(slot);
      }
    }
    return out;
  }

  const offerDrivenRequired = $derived(basketRequiredSlotsFromOffers());
  const validationRequired = $derived(requiredSlotsFromValidation($cartState.validation));
  const allRequiredSlots = $derived(new Set<string>([...offerDrivenRequired, ...validationRequired]));

  const {
    customerRequired,
    emailRequired,
    phoneRequired,
    birthDateRequired,
    shippingRequired,
    shipStreetRequired,
    shipLocalityRequired,
    shipPostalRequired,
    shipCountryRequired,
    billingRequired,
    billStreetRequired,
    billLocalityRequired,
    billPostalRequired,
    billCountryRequired
  } = $derived(deriveFormRequirements(allRequiredSlots));

  // Field-level error based purely on server ValidationRequirement.path
  function fieldHasError(path: string): boolean {
    const v = $cartState.validation;
    if (!v || !Array.isArray(v.requirements)) {
      return false;
    }
    return v.requirements.some((r) => {
      const p = (r.path ?? '').toString();
      const status = (r.status ?? '').toString();
      return p === path && status !== 'ok';
    });
  }

  function hasBlockingUnmet(v: any): boolean {
    if (!v || !Array.isArray(v.requirements)) return false;
    return v.requirements.some((r: any) => !!r?.blocking && (r?.status ?? '') !== 'ok');
  }

  async function goToReview(): Promise<void> {
    await submitAction.run();
  }

  // Preview and payment happen in the subsequent popup steps

  // Continue is enabled only when the last server validation has no unmet blocking requirements
  // NOTE: Derived canContinue was unused; button disabling is handled inline.
</script>
<FlowStepScaffold
  {...CHECKOUT_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Checkout"
  subtitle="Provide required checkout information."
>

    <p>
        The seller needs some additional information from you. Please fill in the forms below:
    </p>
    <div class="space-y-4 text-xs">
      {#if customerRequired}
        <div class="space-y-2">
          <div class="font-semibold opacity-80">Customer identification</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label class="form-control">
              <span class="label-text text-xs">First name</span>
              <input
                class="input input-xs input-bordered"
                bind:value={givenName}
                  data-popup-initial-input
                onblur={validateOnBlur}
                class:border-error={fieldHasError('/customer/givenName')}
                required
              />
            </label>
            <label class="form-control">
              <span class="label-text text-xs">Last name</span>
              <input
                class="input input-xs input-bordered"
                bind:value={familyName}
                onblur={validateOnBlur}
                class:border-error={fieldHasError('/customer/familyName')}
                required
              />
            </label>
          </div>
        </div>
      {/if}

      {#if shippingRequired}
        <div class="space-y-2">
          <div class="font-semibold opacity-80">Shipping address</div>
          <div class="grid grid-cols-1 gap-2">
            {#if shipStreetRequired}
              <label class="form-control">
                <span class="label-text text-xs">Street address</span>
                <input
                  class="input input-xs input-bordered"
                  bind:value={shippingStreet}
                  data-popup-initial-input
                  onblur={validateOnBlur}
                  class:border-error={fieldHasError('/shippingAddress/streetAddress')}
                  required
                />
              </label>
            {/if}

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {#if shipLocalityRequired}
                <label class="form-control">
                  <span class="label-text text-xs">City / locality</span>
                  <input
                    class="input input-xs input-bordered"
                    bind:value={shippingLocality}
                    onblur={validateOnBlur}
                    class:border-error={fieldHasError('/shippingAddress/addressLocality')}
                    required
                  />
                </label>
              {/if}
              {#if shipPostalRequired}
                <label class="form-control">
                  <span class="label-text text-xs">Postal code</span>
                  <input
                    class="input input-xs input-bordered"
                    bind:value={shippingPostal}
                    onblur={validateOnBlur}
                    class:border-error={fieldHasError('/shippingAddress/postalCode')}
                    required
                  />
                </label>
              {/if}
              {#if shipCountryRequired}
                <label class="form-control">
                  <span class="label-text text-xs">Country</span>
                  <input
                    class="input input-xs input-bordered"
                    bind:value={shippingCountry}
                    placeholder="DE, FR, …"
                    onblur={validateOnBlur}
                    class:border-error={fieldHasError('/shippingAddress/addressCountry')}
                    required
                  />
                </label>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      {#if billingRequired}
        <div class="space-y-2">
          <div class="font-semibold opacity-80">Billing address</div>
          <div class="grid grid-cols-1 gap-2">
            {#if billStreetRequired}
              <label class="form-control">
                <span class="label-text text-xs">Street address</span>
                <input
                  class="input input-xs input-bordered"
                  bind:value={billingStreet}
                  onblur={validateOnBlur}
                  class:border-error={fieldHasError('/billingAddress/streetAddress')}
                  required
                />
              </label>
            {/if}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {#if billLocalityRequired}
                <label class="form-control">
                  <span class="label-text text-xs">City / locality</span>
                  <input
                    class="input input-xs input-bordered"
                    bind:value={billingLocality}
                    onblur={validateOnBlur}
                    class:border-error={fieldHasError('/billingAddress/addressLocality')}
                    required
                  />
                </label>
              {/if}
              {#if billPostalRequired}
                <label class="form-control">
                  <span class="label-text text-xs">Postal code</span>
                  <input
                    class="input input-xs input-bordered"
                    bind:value={billingPostal}
                    onblur={validateOnBlur}
                    class:border-error={fieldHasError('/billingAddress/postalCode')}
                    required
                  />
                </label>
              {/if}
              {#if billCountryRequired}
                <label class="form-control">
                  <span class="label-text text-xs">Country</span>
                  <input
                    class="input input-xs input-bordered"
                    bind:value={billingCountry}
                    placeholder="DE, FR, …"
                    onblur={validateOnBlur}
                    class:border-error={fieldHasError('/billingAddress/addressCountry')}
                    required
                  />
                </label>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      {#if emailRequired || phoneRequired}
        <div class="space-y-2">
          <div class="font-semibold opacity-80">Contact</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {#if emailRequired}
              <label class="form-control">
                <span class="label-text text-xs">Email</span>
                <input
                  class="input input-xs input-bordered"
                  type="email"
                  bind:value={contactEmail}
                  data-popup-initial-input
                  onblur={validateOnBlur}
                  class:border-error={fieldHasError('/contactPoint/email')}
                  required
                />
              </label>
            {/if}
            {#if phoneRequired}
              <label class="form-control">
                <span class="label-text text-xs">Phone</span>
                <input
                  class="input input-xs input-bordered"
                  type="tel"
                  bind:value={contactPhone}
                  onblur={validateOnBlur}
                  class:border-error={fieldHasError('/contactPoint/telephone')}
                  required
                />
              </label>
            {/if}
          </div>
        </div>
      {/if}

      {#if birthDateRequired}
        <div class="space-y-2">
          <div class="font-semibold opacity-80">Age verification</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label class="form-control">
              <span class="label-text text-xs">Birth date</span>
              <input
                class="input input-xs input-bordered"
                type="date"
                bind:value={birthDate}
                data-popup-initial-input
                  onblur={validateOnBlur}
                class:border-error={fieldHasError('/ageProof/birthDate')}
                required
              />
            </label>
          </div>
        </div>
      {/if}

      {#if validateAction.error || submitAction.error}
        <StepAlert variant="error" className="text-xs mt-2" message={validateAction.error || submitAction.error} />
      {/if}

      <StepActionBar>
        {#snippet primary()}
          <button
            type="button"
            class="btn btn-sm btn-primary"
            onclick={goToReview}
            onmousedown={markSkipNextBlurValidation}
            data-skip-blur-validation="true"
            disabled={submitAction.loading}
          >
            {submitAction.loading ? 'Checking…' : 'Continue'}
          </button>
        {/snippet}
      </StepActionBar>
    </div>
  </FlowStepScaffold>
