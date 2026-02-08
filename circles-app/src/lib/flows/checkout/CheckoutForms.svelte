<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import {
    cartState,
    updateBasketDetails,
    validateCart,
    previewCartOrder
  } from '$lib/cart/store';
  import { popupControls } from '$lib/shared/state/popup';
  import CheckoutReview from './CheckoutReview.svelte';

  // This component shows only the address/details step.

  let localError: string | null = $state(null);
  let validating = $state(false);

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

  async function validateOnBlur(): Promise<void> {
    localError = null;
    try {
      await persistDetails();
      await validateCart();
    } catch (e: unknown) {
      localError =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
          ? e
          : 'Unknown error';
    }
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

  const emailRequired = $derived(allRequiredSlots.has('contactPoint.email'));
  const phoneRequired = $derived(allRequiredSlots.has('contactPoint.telephone'));

  // Shipping and billing groups: show if any of their slots are required (coarse or fine)
  const shippingRequired = $derived(
    allRequiredSlots.has('shippingAddress') ||
      allRequiredSlots.has('shippingAddress.streetAddress') ||
      allRequiredSlots.has('shippingAddress.addressLocality') ||
      allRequiredSlots.has('shippingAddress.postalCode') ||
      allRequiredSlots.has('shippingAddress.addressCountry')
  );
  const shipStreetRequired = $derived(
    allRequiredSlots.has('shippingAddress.streetAddress') || shippingRequired
  );
  const shipLocalityRequired = $derived(
    allRequiredSlots.has('shippingAddress.addressLocality') || shippingRequired
  );
  const shipPostalRequired = $derived(
    allRequiredSlots.has('shippingAddress.postalCode') || shippingRequired
  );
  const shipCountryRequired = $derived(
    allRequiredSlots.has('shippingAddress.addressCountry') || shippingRequired
  );

  const billingRequired = $derived(
    allRequiredSlots.has('billingAddress') ||
      allRequiredSlots.has('billingAddress.streetAddress') ||
      allRequiredSlots.has('billingAddress.addressLocality') ||
      allRequiredSlots.has('billingAddress.postalCode') ||
      allRequiredSlots.has('billingAddress.addressCountry')
  );
  const billStreetRequired = $derived(
    allRequiredSlots.has('billingAddress.streetAddress') || billingRequired
  );
  const billLocalityRequired = $derived(
    allRequiredSlots.has('billingAddress.addressLocality') || billingRequired
  );
  const billPostalRequired = $derived(
    allRequiredSlots.has('billingAddress.postalCode') || billingRequired
  );
  const billCountryRequired = $derived(
    allRequiredSlots.has('billingAddress.addressCountry') || billingRequired
  );

  const birthDateRequired = $derived(
    allRequiredSlots.has('ageProof.birthDate') || allRequiredSlots.has('ageProof')
  );

  const customerRequired = $derived(allRequiredSlots.has('customer'));

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
    localError = null;
    validating = true;
    try {
      await persistDetails();
      const v = await validateCart();
      if (needsShippingFromValidation(v) || hasBlockingUnmet(v)) {
        // Stay on details; per-field errors will be visible
        return;
      }
      await previewCartOrder();
      popupControls.open({
        title: 'Review order',
        component: CheckoutReview,
        props: {},
      });
    } catch (e: unknown) {
      localError =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
          ? e
          : 'Unknown error';
    } finally {
      validating = false;
    }
  }

  // Preview and payment happen in the subsequent popup steps

  // Continue is enabled only when the last server validation has no unmet blocking requirements
  // NOTE: Derived canContinue was unused; button disabling is handled inline.
</script>

<FlowDecoration>
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
                onblur={validateOnBlur}
                class:border-error={fieldHasError('/ageProof/birthDate')}
                required
              />
            </label>
          </div>
        </div>
      {/if}

      {#if localError}
        <div class="alert alert-error text-xs mt-2">
          {localError}
        </div>
      {/if}

      <div class="mt-3 flex justify-end gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline"
          onclick={goToReview}
          disabled={validating || $cartState.loading}
        >
          {validating || $cartState.loading ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </div>
  </FlowDecoration>
