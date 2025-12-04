<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import {
    cartState,
    updateBasketDetails,
    validateCart,
    previewCartOrder
  } from '$lib/cart/store';
  import { popupControls } from '$lib/stores/popUp';
  import CheckoutReview from './CheckoutReview.svelte';

  // This component shows only the address/details step.

  let localError: string | null = $state(null);
  let validating = $state(false);
  // Submitting is no longer used here (checkout happens in CheckoutReview)
  let submitting = $state(false);

  // Local form state, hydrated once from the basket
  let shippingStreet = $state('');
  let shippingLocality = $state('');
  let shippingPostal = $state('');
  let shippingCountry = $state('');
  let contactEmail = $state('');
  let contactPhone = $state('');
  let birthDate = $state('');

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

    const contact = b.contactPoint as any;
    contactEmail = (contact?.email as string) ?? '';
    contactPhone = (contact?.telephone as string) ?? '';

    const age = b.ageProof as any;
    birthDate = (age?.birthDate as string) ?? '';

    formInitialised = true;
  });

  async function persistDetails(): Promise<void> {
    const patch: any = {};

    patch.shippingAddress = {
      '@type': 'PostalAddress',
      streetAddress: shippingStreet || null,
      addressLocality: shippingLocality || null,
      postalCode: shippingPostal || null,
      addressCountry: shippingCountry || null
    };

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

  const validation = $derived($cartState.validation);
  // Preview and payment happen in the subsequent popup steps

  // Continue is enabled only when the last server validation has no unmet blocking requirements
  const canContinue = $derived(
    !$cartState.loading &&
      !validating &&
      !!validation &&
      !needsShippingFromValidation(validation) &&
      !hasBlockingUnmet(validation)
  );
</script>

<FlowDecoration>
    <div class="space-y-3 text-xs">
      <div class="grid grid-cols-1 gap-2">
        <label class="form-control">
          <span class="label-text text-xs">Street address</span>
          <input
            class="input input-xs input-bordered"
            bind:value={shippingStreet}
            on:blur={validateOnBlur}
            class:border-error={fieldHasError('/shippingAddress/streetAddress')}
          />
        </label>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label class="form-control">
            <span class="label-text text-xs">City / locality</span>
            <input
              class="input input-xs input-bordered"
              bind:value={shippingLocality}
              on:blur={validateOnBlur}
              class:border-error={fieldHasError('/shippingAddress/addressLocality')}
            />
          </label>
          <label class="form-control">
            <span class="label-text text-xs">Postal code</span>
            <input
              class="input input-xs input-bordered"
              bind:value={shippingPostal}
              on:blur={validateOnBlur}
              class:border-error={fieldHasError('/shippingAddress/postalCode')}
            />
          </label>
          <label class="form-control">
            <span class="label-text text-xs">Country</span>
            <input
              class="input input-xs input-bordered"
              bind:value={shippingCountry}
              placeholder="DE, FR, …"
              on:blur={validateOnBlur}
              class:border-error={fieldHasError('/shippingAddress/addressCountry')}
            />
          </label>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <label class="form-control">
          <span class="label-text text-xs">
            Email {#if emailRequired}<span class="text-error">(required)</span>{:else}(optional){/if}
          </span>
          <input
            class="input input-xs input-bordered"
            type="email"
            bind:value={contactEmail}
            on:blur={validateOnBlur}
            class:border-error={fieldHasError('/contactPoint/email')}
            required={emailRequired}
          />
        </label>
        <label class="form-control">
          <span class="label-text text-xs">
            Phone {#if phoneRequired}<span class="text-error">(required)</span>{:else}(optional){/if}
          </span>
          <input
            class="input input-xs input-bordered"
            type="tel"
            bind:value={contactPhone}
            on:blur={validateOnBlur}
            class:border-error={fieldHasError('/contactPoint/telephone')}
            required={phoneRequired}
          />
        </label>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <label class="form-control">
          <span class="label-text text-xs">Birth date (optional)</span>
          <input
            class="input input-xs input-bordered"
            type="date"
            bind:value={birthDate}
            on:blur={validateOnBlur}
          />
        </label>
      </div>

      {#if localError}
        <div class="alert alert-error text-xs mt-2">
          {localError}
        </div>
      {/if}

      <div class="mt-3 flex justify-end gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline"
          on:click={goToReview}
          disabled={validating || $cartState.loading}
        >
          {validating || $cartState.loading ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </div>
  </FlowDecoration>
