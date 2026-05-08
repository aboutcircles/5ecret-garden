<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
  import { T } from '$lib/design-system/tokens.js';
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

    <p style="font-size:12.5px;color:{T.inkMuted};margin:0;line-height:1.5;">
      The seller needs some additional information. Please fill in the fields below.
    </p>

    <div style="display:flex;flex-direction:column;gap:16px;">
      {#if customerRequired}
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Customer identification</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <label style="display:flex;flex-direction:column;gap:4px;">
              <span style="font-size:11px;color:{T.inkMuted};">First name</span>
              <input
                style="padding:9px 12px;border:1px solid {fieldHasError('/customer/givenName') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                bind:value={givenName}
                data-popup-initial-input
                onblur={validateOnBlur}
                required
              />
            </label>
            <label style="display:flex;flex-direction:column;gap:4px;">
              <span style="font-size:11px;color:{T.inkMuted};">Last name</span>
              <input
                style="padding:9px 12px;border:1px solid {fieldHasError('/customer/familyName') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                bind:value={familyName}
                onblur={validateOnBlur}
                required
              />
            </label>
          </div>
        </div>
      {/if}

      {#if shippingRequired}
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Shipping address</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            {#if shipStreetRequired}
              <label style="display:flex;flex-direction:column;gap:4px;">
                <span style="font-size:11px;color:{T.inkMuted};">Street address</span>
                <input
                  style="padding:9px 12px;border:1px solid {fieldHasError('/shippingAddress/streetAddress') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                  bind:value={shippingStreet}
                  data-popup-initial-input
                  onblur={validateOnBlur}
                  required
                />
              </label>
            {/if}

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
              {#if shipLocalityRequired}
                <label style="display:flex;flex-direction:column;gap:4px;">
                  <span style="font-size:11px;color:{T.inkMuted};">City</span>
                  <input
                    style="padding:9px 12px;border:1px solid {fieldHasError('/shippingAddress/addressLocality') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                    bind:value={shippingLocality}
                    onblur={validateOnBlur}
                    required
                  />
                </label>
              {/if}
              {#if shipPostalRequired}
                <label style="display:flex;flex-direction:column;gap:4px;">
                  <span style="font-size:11px;color:{T.inkMuted};">Postal code</span>
                  <input
                    style="padding:9px 12px;border:1px solid {fieldHasError('/shippingAddress/postalCode') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                    bind:value={shippingPostal}
                    onblur={validateOnBlur}
                    required
                  />
                </label>
              {/if}
              {#if shipCountryRequired}
                <label style="display:flex;flex-direction:column;gap:4px;">
                  <span style="font-size:11px;color:{T.inkMuted};">Country</span>
                  <input
                    style="padding:9px 12px;border:1px solid {fieldHasError('/shippingAddress/addressCountry') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                    bind:value={shippingCountry}
                    placeholder="DE, FR, …"
                    onblur={validateOnBlur}
                    required
                  />
                </label>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      {#if billingRequired}
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Billing address</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            {#if billStreetRequired}
              <label style="display:flex;flex-direction:column;gap:4px;">
                <span style="font-size:11px;color:{T.inkMuted};">Street address</span>
                <input
                  style="padding:9px 12px;border:1px solid {fieldHasError('/billingAddress/streetAddress') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                  bind:value={billingStreet}
                  onblur={validateOnBlur}
                  required
                />
              </label>
            {/if}
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
              {#if billLocalityRequired}
                <label style="display:flex;flex-direction:column;gap:4px;">
                  <span style="font-size:11px;color:{T.inkMuted};">City</span>
                  <input
                    style="padding:9px 12px;border:1px solid {fieldHasError('/billingAddress/addressLocality') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                    bind:value={billingLocality}
                    onblur={validateOnBlur}
                    required
                  />
                </label>
              {/if}
              {#if billPostalRequired}
                <label style="display:flex;flex-direction:column;gap:4px;">
                  <span style="font-size:11px;color:{T.inkMuted};">Postal code</span>
                  <input
                    style="padding:9px 12px;border:1px solid {fieldHasError('/billingAddress/postalCode') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                    bind:value={billingPostal}
                    onblur={validateOnBlur}
                    required
                  />
                </label>
              {/if}
              {#if billCountryRequired}
                <label style="display:flex;flex-direction:column;gap:4px;">
                  <span style="font-size:11px;color:{T.inkMuted};">Country</span>
                  <input
                    style="padding:9px 12px;border:1px solid {fieldHasError('/billingAddress/addressCountry') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                    bind:value={billingCountry}
                    placeholder="DE, FR, …"
                    onblur={validateOnBlur}
                    required
                  />
                </label>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      {#if emailRequired || phoneRequired}
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Contact</div>
          <div style="display:grid;grid-template-columns:{(emailRequired && phoneRequired) ? '1fr 1fr' : '1fr'};gap:8px;">
            {#if emailRequired}
              <label style="display:flex;flex-direction:column;gap:4px;">
                <span style="font-size:11px;color:{T.inkMuted};">Email</span>
                <input
                  style="padding:9px 12px;border:1px solid {fieldHasError('/contactPoint/email') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                  type="email"
                  bind:value={contactEmail}
                  data-popup-initial-input
                  onblur={validateOnBlur}
                  required
                />
              </label>
            {/if}
            {#if phoneRequired}
              <label style="display:flex;flex-direction:column;gap:4px;">
                <span style="font-size:11px;color:{T.inkMuted};">Phone</span>
                <input
                  style="padding:9px 12px;border:1px solid {fieldHasError('/contactPoint/telephone') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
                  type="tel"
                  bind:value={contactPhone}
                  onblur={validateOnBlur}
                  required
                />
              </label>
            {/if}
          </div>
        </div>
      {/if}

      {#if birthDateRequired}
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Age verification</div>
          <label style="display:flex;flex-direction:column;gap:4px;max-width:240px;">
            <span style="font-size:11px;color:{T.inkMuted};">Birth date</span>
            <input
              style="padding:9px 12px;border:1px solid {fieldHasError('/ageProof/birthDate') ? T.negative : T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
              type="date"
              bind:value={birthDate}
              data-popup-initial-input
              onblur={validateOnBlur}
              required
            />
          </label>
        </div>
      {/if}

      {#if validateAction.error || submitAction.error}
        <StepAlert variant="error" message={validateAction.error || submitAction.error} />
      {/if}

      <div style="display:flex;justify-content:flex-end;margin-top:4px;">
        <button
          type="button"
          style="
            height:44px;padding:0 24px;border-radius:9999px;border:0;cursor:{submitAction.loading ? 'wait' : 'pointer'};
            background:{T.primary};color:#fff;
            font-family:{T.fontSans};font-size:14px;font-weight:580;
            box-shadow:0 4px 12px rgba(88,73,212,0.25);
            display:inline-flex;align-items:center;gap:8px;
            opacity:{submitAction.loading ? 0.7 : 1};
          "
          onclick={goToReview}
          onmousedown={markSkipNextBlurValidation}
          data-skip-blur-validation="true"
          disabled={submitAction.loading}
        >
          {#if submitAction.loading}<span class="loading loading-spinner loading-xs"></span>{/if}
          {submitAction.loading ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </div>
  </FlowStepScaffold>
