<script lang="ts">
  import AdminProductFormBase from './AdminProductFormBase.svelte';
  import type { AdminProductType, AdminUnifiedProduct } from '../types';
  import type { CodeProductConfig, RouteUpsertInput } from '$lib/areas/admin/services/gateway/adminClient';
  import { normalizeAddressInput, normalizeSku } from '../productEditorUtils';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    product?: AdminUnifiedProduct | null;
    onSubmit: (payload: {
      type: AdminProductType;
      route?: RouteUpsertInput;
      code?: CodeProductConfig;
    }) => Promise<void>;
    onDisable?: () => Promise<void>;
    onCancel?: () => void;
  }

  let {
    product = null,
    onSubmit,
    onDisable,
    onCancel,
  }: Props = $props();

  const chainId = 100;
  let seller: string = $state(product?.seller ?? '');
  let sku: string = $state(product?.sku ?? '');

  let downloadUrlTemplate: string = $state(product?.code?.downloadUrlTemplate ?? '');
  let codesTextarea: string = $state('');
  let codeEnabled: boolean = $state(product?.code?.enabled ?? true);

  let saving = $state(false);
  let formError: string | null = $state(null);

  function parseCodes(): string[] | undefined {
    const codes = codesTextarea
      .split('\n')
      .map((code) => code.trim())
      .filter((code) => code.length > 0);
    return codes.length > 0 ? codes : undefined;
  }

  async function submit(): Promise<void> {
    saving = true;
    formError = null;
    try {
      const normalizedSeller = normalizeAddressInput(seller);
      const normalizedSku = normalizeSku(sku);
      if (!normalizedSeller || !normalizedSku) {
        formError = 'Please provide a valid seller address and SKU.';
        return;
      }

      const code: CodeProductConfig = {
        chainId,
        seller: normalizedSeller,
        sku: normalizedSku,
        poolId: product?.code?.poolId ?? '',
        downloadUrlTemplate: downloadUrlTemplate.trim() || undefined,
        codes: parseCodes(),
        enabled: codeEnabled,
      };

      await onSubmit({ type: 'codedispenser', code });
    } catch (error) {
      formError = error instanceof Error ? error.message : String(error);
    } finally {
      saving = false;
    }
  }
</script>

<AdminProductFormBase
  title={product ? 'Edit Code product' : 'Create Code product'}
  subtitle="Configure the code dispenser adapter; routes are handled automatically."
  onSubmit={submit}
  onCancel={onCancel}
  loading={saving}
  submitLabel={product ? 'Save changes' : 'Create product'}
>
  {#if formError}
    <p style="color:{T.negative};font-size:13px;">{formError}</p>
  {/if}

  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Seller address *</span>
      <input
        type="text"
        style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;"
        bind:value={seller}
        placeholder="0x..."
      />
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">SKU *</span>
      <input
        type="text"
        style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;"
        bind:value={sku}
        placeholder="voucher-10"
      />
    </label>
  </div>

  <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};"><span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>Code dispenser<span style="flex:1;height:1px;background:{T.hairlineSoft};"></span></div>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Download URL template</span>
      <input
        style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;"
        bind:value={downloadUrlTemplate}
        placeholder={`https://example.com/${'{code}'}`}
      />
      <span style="font-size:11px;opacity:0.7;">Use &lbrace;code&rbrace; as placeholder</span>
    </label>
  </div>
  <label style="display:flex;flex-direction:column;gap:4px;">
    <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Seed codes (one per line)</span>
    <textarea style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:13px;font-family:{T.fontMono};outline:none;box-sizing:border-box;resize:vertical;" rows="3" bind:value={codesTextarea}></textarea>
  </label>
  {#if product && onDisable}
    <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};"><span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>Danger zone<span style="flex:1;height:1px;background:{T.hairlineSoft};"></span></div>
    <button
      type="button"
      style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid rgba(196,68,48,0.3);background:transparent;color:{T.negative};cursor:pointer;font-family:{T.fontSans};font-size:12.5px;"
      onclick={async () => {
        saving = true;
        try {
          await onDisable?.();
        } finally {
          saving = false;
        }
      }}
      disabled={saving}
    >
      Disable product
    </button>
  {/if}

  <label style="display:flex;flex-direction:column;gap:4px;">
    <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Enabled</span>
    <input type="checkbox" style="width:14px;height:14px;accent-color:{T.primary};" bind:checked={codeEnabled} />
  </label>
</AdminProductFormBase>