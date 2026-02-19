<script lang="ts">
  import AdminProductFormBase from './AdminProductFormBase.svelte';
  import type { AdminProductType, AdminUnifiedProduct } from '../types';
  import type { CodeProductConfig, RouteUpsertInput } from '$lib/areas/admin/services/gateway/adminClient';
  import { normalizeAddressInput, normalizeSku } from '../productEditorUtils';

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
    <p class="text-error text-sm">{formError}</p>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label class="form-control">
      <span class="label-text">Seller address *</span>
      <input
        type="text"
        class="input input-bordered input-sm font-mono"
        bind:value={seller}
        placeholder="0x..."
      />
    </label>
    <label class="form-control">
      <span class="label-text">SKU *</span>
      <input
        type="text"
        class="input input-bordered input-sm font-mono"
        bind:value={sku}
        placeholder="voucher-10"
      />
    </label>
  </div>

  <div class="divider text-xs">Code dispenser</div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label class="form-control">
      <span class="label-text">Download URL template</span>
      <input
        class="input input-bordered input-sm"
        bind:value={downloadUrlTemplate}
        placeholder={`https://example.com/${'{code}'}`}
      />
      <span class="label-text-alt text-xs opacity-70">Use &lbrace;code&rbrace; as placeholder</span>
    </label>
  </div>
  <label class="form-control">
    <span class="label-text">Seed codes (one per line)</span>
    <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="3" bind:value={codesTextarea}></textarea>
  </label>
  {#if product && onDisable}
    <div class="divider text-xs">Danger zone</div>
    <button
      type="button"
      class="btn btn-outline btn-error btn-sm"
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

  <label class="form-control">
    <span class="label-text">Enabled</span>
    <input type="checkbox" class="checkbox checkbox-sm" bind:checked={codeEnabled} />
  </label>
</AdminProductFormBase>
