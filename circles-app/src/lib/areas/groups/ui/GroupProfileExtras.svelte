<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { loadProfileOrInit, rebaseAndSaveProfile, normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { ProfilesBindings } from '@circles-market/sdk';
  import { getProfilesBindings } from '$lib/areas/market/offers';
  import { removeProfileFromCache } from '$lib/shared/utils/profile';
  import type { Address } from '@aboutcircles/sdk-types';
  import { T } from '$lib/design-system/tokens.js';
  import {
    type GroupExtrasForm,
    emptyForm,
    formFromProfile,
    validateGroupExtras,
    applyGroupProfileExtras,
    isFormEmpty,
    parseAdditionalCriteria,
    groupAccessLabel,
    MAX_LINK_LABEL_LENGTH,
    MAX_ADDITIONAL_CRITERIA,
    MAX_CRITERION_LENGTH,
  } from '$lib/areas/groups/model/groupProfileExtras';

  interface Props {
    avatarAddress: Address;
    pinApiBase?: string;
  }
  let { avatarAddress, pinApiBase }: Props = $props();

  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let saving = $state(false);
  let form = $state<GroupExtrasForm>(emptyForm());
  let initial = $state<GroupExtrasForm>(emptyForm());
  let errors = $state<Record<string, string>>({});
  let touched = $state<Record<string, boolean>>({});
  let submitAttempted = $state(false);
  let savedAtLeastOnce = $state(false);

  let resolvedAvatar = $state<Address | null>(null);
  let initialGroupType = $state<string>('');

  let inputRefs: Record<string, HTMLElement | null> = {};

  function getBindings(): ProfilesBindings {
    return getProfilesBindings({ pinApiBase }).bindings;
  }

  async function loadProfile() {
    loading = true;
    loadError = null;
    try {
      const norm = normalizeAddress(avatarAddress) as Address;
      resolvedAvatar = norm;
      const { profile } = await loadProfileOrInit(getBindings(), norm);
      const f = formFromProfile(profile);
      form = f;
      initial = { ...f };
      initialGroupType = f.groupType;
    } catch (e: any) {
      loadError = String(e?.message ?? e);
    } finally {
      loading = false;
    }
  }

  function markTouched(field: keyof GroupExtrasForm) {
    touched[field] = true;
    revalidate();
  }

  function revalidate() {
    const { errors: errs } = validateGroupExtras(form);
    errors = errs;
  }

  $effect(() => {
    // Re-run validation whenever the form is touched after first submit attempt
    if (submitAttempted) {
      const { errors: errs } = validateGroupExtras(form);
      errors = errs;
    }
  });

  const hasChanges = $derived(JSON.stringify(form) !== JSON.stringify(initial));
  const canSave = $derived(hasChanges && !saving);
  const showReadOnly = $derived(!loading && !savedAtLeastOnce && isFormEmpty(initial));
  const criteriaLines = $derived(parseAdditionalCriteria(form.additionalCriteria));
  const criteriaCount = $derived(criteriaLines.length);

  function fieldError(name: keyof GroupExtrasForm): string | null {
    if (!touched[name] && !submitAttempted) return null;
    return errors[name] ?? null;
  }

  async function focusFirstError() {
    await tick();
    const order: (keyof GroupExtrasForm)[] = [
      'website',
      'linkLabel',
      'linkUrl',
      'groupType',
      'membershipFee',
      'minRepScore',
      'additionalCriteria',
      'contactEmail',
      'contactWebsite',
    ];
    for (const f of order) {
      if (errors[f] && inputRefs[f]) {
        inputRefs[f]?.focus();
        return;
      }
    }
  }

  async function save() {
    if (saving) return;
    if (!resolvedAvatar) return;
    submitAttempted = true;
    const { ok, errors: errs } = validateGroupExtras(form);
    errors = errs;
    if (!ok) {
      await focusFirstError();
      return;
    }

    saving = true;
    const bindings = getBindings();
    try {
      await runTask({
        name: 'Saving group profile…',
        promise: (async () => {
          const cid = await rebaseAndSaveProfile(bindings, resolvedAvatar!, (p: any) => {
            applyGroupProfileExtras(p, form);
          });
          await bindings.updateAvatarProfileDigest(resolvedAvatar!, cid);
          removeProfileFromCache(resolvedAvatar!);
        })(),
      });
      initial = { ...form };
      initialGroupType = form.groupType;
      savedAtLeastOnce = true;
      submitAttempted = false;
      touched = {};
    } finally {
      saving = false;
    }
  }

  function cancel() {
    form = { ...initial };
    errors = {};
    touched = {};
    submitAttempted = false;
  }

  onMount(() => {
    void loadProfile();
  });

  // ── style helpers (match GroupSetting.svelte conventions) ───────────────
  const eyebrow = `font-size:10px;font-weight:600;color:${T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin:0 0 6px 2px;display:block;`;
  const labelStyle = `font-size:12px;font-weight:600;color:${T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;display:flex;align-items:center;gap:4px;`;
  const baseInput = `width:100%;padding:10px 14px;border-radius:10px;font-family:${T.fontSans};font-size:13px;color:${T.ink};background:${T.surface};box-sizing:border-box;`;
  function inputStyle(invalid: boolean) {
    return `${baseInput}border:1px solid ${invalid ? T.negative : T.hairline};`;
  }
  const fieldRow = 'display:flex;flex-direction:column;gap:6px;';
  const errText = `font-size:11.5px;color:${T.negative};`;
  const counter = `font-size:11px;color:${T.inkMuted};`;
  const counterBad = `font-size:11px;color:${T.negative};`;
  const sectionBox = `background:${T.surfaceAlt};border:1px solid ${T.hairlineSoft};border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:14px;`;
  const sectionTitle = `font-family:${T.fontSans};font-size:13px;font-weight:580;color:${T.ink};margin:0;`;
  const sectionHint = `font-size:11.5px;color:${T.inkMuted};margin:2px 0 0 0;`;
  const summaryRow = `display:flex;gap:8px;font-size:12.5px;color:${T.inkBody};`;
  const summaryKey = `min-width:130px;color:${T.inkMuted};font-size:11px;text-transform:uppercase;letter-spacing:0.04em;padding-top:1px;`;
  const headerLine = `display:flex;align-items:baseline;justify-content:space-between;gap:8px;`;
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
  <div style={headerLine}>
    <div>
      <h3 style={sectionTitle}>Group profile</h3>
      <p style={sectionHint}>Public details shown to people who view the group.</p>
    </div>
  </div>

  {#if loadError}
    <div role="alert" style="font-size:12px;color:{T.negative};background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);border-radius:10px;padding:10px 14px;">{loadError}</div>
  {/if}

  {#if loading}
    <div style="font-size:12.5px;color:{T.inkMuted};">Loading…</div>
  {:else}
    {#if showReadOnly}
      <div style="background:{T.primaryFaint};border:1px solid rgba(88,73,212,0.14);border-radius:10px;padding:10px 14px;font-size:12.5px;color:{T.inkBody};">
        No extra group profile fields set yet. Fill any of the sections below to publish them on the profile.
      </div>
    {:else if !savedAtLeastOnce && !isFormEmpty(initial)}
      <div style={sectionBox}>
        <h4 style={sectionTitle}>Currently saved</h4>
        {#if initial.website}
          <div style={summaryRow}><span style={summaryKey}>Website</span><span>{initial.website}</span></div>
        {/if}
        {#if initial.linkLabel || initial.linkUrl}
          <div style={summaryRow}><span style={summaryKey}>Custom link</span><span>{initial.linkLabel}{initial.linkLabel && initial.linkUrl ? ' → ' : ''}{initial.linkUrl}</span></div>
        {/if}
        {#if initial.groupType}
          <div style={summaryRow}><span style={summaryKey}>Group access</span><span>{groupAccessLabel(initial.groupType)}</span></div>
        {/if}
        {#if initial.membershipFee}
          <div style={summaryRow}><span style={summaryKey}>Membership fee</span><span>{initial.membershipFee}%</span></div>
        {/if}
        {#if initial.minRepScore}
          <div style={summaryRow}><span style={summaryKey}>Min rep score</span><span>{initial.minRepScore}</span></div>
        {/if}
        {#if initial.additionalCriteria}
          <div style={summaryRow}><span style={summaryKey}>Additional criteria</span><span style="white-space:pre-wrap;">{initial.additionalCriteria}</span></div>
        {/if}
        {#if initial.contactEmail}
          <div style={summaryRow}><span style={summaryKey}>Contact email</span><span>{initial.contactEmail}</span></div>
        {/if}
        {#if initial.contactWebsite}
          <div style={summaryRow}><span style={summaryKey}>Contact website</span><span>{initial.contactWebsite}</span></div>
        {/if}
      </div>
    {/if}

    <!-- Links section -->
    <div style={sectionBox}>
      <h4 style={sectionTitle}>Links</h4>

      <div style={fieldRow}>
        <label for="gpe-website" style={labelStyle}>Website</label>
        <input
          id="gpe-website"
          type="url"
          bind:this={inputRefs.website}
          style={inputStyle(!!fieldError('website'))}
          bind:value={form.website}
          onblur={() => markTouched('website')}
          placeholder="https://example.org"
          aria-invalid={!!fieldError('website')}
          aria-describedby={fieldError('website') ? 'gpe-website-err' : undefined}
        />
        {#if fieldError('website')}
          <div id="gpe-website-err" style={errText} aria-live="polite">{errors.website}</div>
        {/if}
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div style="{fieldRow};flex:1;min-width:200px;">
          <label for="gpe-linkLabel" style={labelStyle}>Custom link label</label>
          <input
            id="gpe-linkLabel"
            type="text"
            bind:this={inputRefs.linkLabel}
            style={inputStyle(!!fieldError('linkLabel'))}
            bind:value={form.linkLabel}
            onblur={() => markTouched('linkLabel')}
            placeholder="Read our manifesto"
            maxlength={MAX_LINK_LABEL_LENGTH + 8}
            aria-invalid={!!fieldError('linkLabel')}
            aria-describedby={fieldError('linkLabel') ? 'gpe-linkLabel-err' : 'gpe-linkLabel-counter'}
          />
          <div style="display:flex;justify-content:space-between;gap:8px;">
            {#if fieldError('linkLabel')}
              <div id="gpe-linkLabel-err" style={errText} aria-live="polite">{errors.linkLabel}</div>
            {:else}
              <span></span>
            {/if}
            <span id="gpe-linkLabel-counter" style={form.linkLabel.length > MAX_LINK_LABEL_LENGTH ? counterBad : counter}>{form.linkLabel.length} / {MAX_LINK_LABEL_LENGTH}</span>
          </div>
        </div>

        <div style="{fieldRow};flex:2;min-width:240px;">
          <label for="gpe-linkUrl" style={labelStyle}>Custom link URL</label>
          <input
            id="gpe-linkUrl"
            type="url"
            bind:this={inputRefs.linkUrl}
            style={inputStyle(!!fieldError('linkUrl'))}
            bind:value={form.linkUrl}
            onblur={() => markTouched('linkUrl')}
            placeholder="https://example.org/manifesto"
            aria-invalid={!!fieldError('linkUrl')}
            aria-describedby={fieldError('linkUrl') ? 'gpe-linkUrl-err' : undefined}
          />
          {#if fieldError('linkUrl')}
            <div id="gpe-linkUrl-err" style={errText} aria-live="polite">{errors.linkUrl}</div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Membership rules -->
    <div style={sectionBox}>
      <h4 style={sectionTitle}>Membership rules</h4>

      <div style={fieldRow}>
        <label for="gpe-groupType" style={labelStyle}>Group access</label>
        <select
          id="gpe-groupType"
          bind:this={inputRefs.groupType}
          style={inputStyle(false)}
          bind:value={form.groupType}
          onblur={() => markTouched('groupType')}
        >
          <option value="">— Not specified —</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          {#if initialGroupType && initialGroupType !== 'open' && initialGroupType !== 'closed'}
            <option value={initialGroupType}>Other ({initialGroupType})</option>
          {/if}
        </select>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div style="{fieldRow};flex:1;min-width:160px;">
          <label for="gpe-membershipFee" style={labelStyle}>Membership fee (%)</label>
          <input
            id="gpe-membershipFee"
            type="text"
            inputmode="decimal"
            bind:this={inputRefs.membershipFee}
            style={inputStyle(!!fieldError('membershipFee'))}
            bind:value={form.membershipFee}
            onblur={() => markTouched('membershipFee')}
            placeholder="e.g. 2.5"
            aria-invalid={!!fieldError('membershipFee')}
            aria-describedby={fieldError('membershipFee') ? 'gpe-membershipFee-err' : undefined}
          />
          {#if fieldError('membershipFee')}
            <div id="gpe-membershipFee-err" style={errText} aria-live="polite">{errors.membershipFee}</div>
          {/if}
        </div>

        <div style="{fieldRow};flex:1;min-width:160px;">
          <label for="gpe-minRepScore" style={labelStyle}>Min rep score</label>
          <input
            id="gpe-minRepScore"
            type="text"
            inputmode="numeric"
            bind:this={inputRefs.minRepScore}
            style={inputStyle(!!fieldError('minRepScore'))}
            bind:value={form.minRepScore}
            onblur={() => markTouched('minRepScore')}
            placeholder="0"
            aria-invalid={!!fieldError('minRepScore')}
            aria-describedby={fieldError('minRepScore') ? 'gpe-minRepScore-err' : undefined}
          />
          {#if fieldError('minRepScore')}
            <div id="gpe-minRepScore-err" style={errText} aria-live="polite">{errors.minRepScore}</div>
          {/if}
        </div>
      </div>

      <div style={fieldRow}>
        <label for="gpe-additionalCriteria" style={labelStyle}>Additional criteria (one per line)</label>
        <textarea
          id="gpe-additionalCriteria"
          rows="4"
          bind:this={inputRefs.additionalCriteria}
          style="{inputStyle(!!fieldError('additionalCriteria'))};resize:vertical;min-height:80px;font-family:{T.fontSans};"
          bind:value={form.additionalCriteria}
          onblur={() => markTouched('additionalCriteria')}
          placeholder="Active for 3+ months&#10;Trusted by 5+ existing members"
          aria-invalid={!!fieldError('additionalCriteria')}
          aria-describedby={fieldError('additionalCriteria') ? 'gpe-additionalCriteria-err' : 'gpe-additionalCriteria-counter'}
        ></textarea>
        <div style="display:flex;justify-content:space-between;gap:8px;">
          {#if fieldError('additionalCriteria')}
            <div id="gpe-additionalCriteria-err" style={errText} aria-live="polite">{errors.additionalCriteria}</div>
          {:else}
            <span></span>
          {/if}
          <span id="gpe-additionalCriteria-counter" style={criteriaCount > MAX_ADDITIONAL_CRITERIA ? counterBad : counter}>{criteriaCount} / {MAX_ADDITIONAL_CRITERIA} (max {MAX_CRITERION_LENGTH} chars each)</span>
        </div>
      </div>
    </div>

    <!-- Contact -->
    <div style={sectionBox}>
      <h4 style={sectionTitle}>Contact</h4>

      <div style={fieldRow}>
        <label for="gpe-contactEmail" style={labelStyle}>Email</label>
        <input
          id="gpe-contactEmail"
          type="email"
          bind:this={inputRefs.contactEmail}
          style={inputStyle(!!fieldError('contactEmail'))}
          bind:value={form.contactEmail}
          onblur={() => markTouched('contactEmail')}
          placeholder="hello@example.org"
          aria-invalid={!!fieldError('contactEmail')}
          aria-describedby={fieldError('contactEmail') ? 'gpe-contactEmail-err' : undefined}
        />
        {#if fieldError('contactEmail')}
          <div id="gpe-contactEmail-err" style={errText} aria-live="polite">{errors.contactEmail}</div>
        {/if}
      </div>

      <div style={fieldRow}>
        <label for="gpe-contactWebsite" style={labelStyle}>Contact website</label>
        <input
          id="gpe-contactWebsite"
          type="url"
          bind:this={inputRefs.contactWebsite}
          style={inputStyle(!!fieldError('contactWebsite'))}
          bind:value={form.contactWebsite}
          onblur={() => markTouched('contactWebsite')}
          placeholder="https://example.org/contact"
          aria-invalid={!!fieldError('contactWebsite')}
          aria-describedby={fieldError('contactWebsite') ? 'gpe-contactWebsite-err' : undefined}
        />
        {#if fieldError('contactWebsite')}
          <div id="gpe-contactWebsite-err" style={errText} aria-live="polite">{errors.contactWebsite}</div>
        {/if}
      </div>
    </div>

    <div style="position:sticky;bottom:0;z-index:10;background:rgba(255,255,255,0.9);backdrop-filter:blur(8px);border:1px solid {T.hairlineSoft};border-radius:14px;padding:12px;display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:4px;">
      <button
        type="button"
        style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;"
        onclick={cancel}
        disabled={!hasChanges || saving}
      >Cancel</button>
      <button
        type="button"
        style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:{T.primary};color:#fff;cursor:pointer;font-family:{T.fontSans};font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);opacity:{canSave ? 1 : 0.6};"
        onclick={save}
        disabled={!canSave}
      >{saving ? 'Saving…' : 'Save profile'}</button>
    </div>
  {/if}
</div>
