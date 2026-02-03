<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import AdminProductFormBase from '$lib/admin/components/AdminProductFormBase.svelte';
  import { normalizeAddressInput } from '$lib/admin/productEditorUtils';
  import type { AdminNewConnectionFlowContext } from './context';

  interface Props {
    context: AdminNewConnectionFlowContext;
    onCreate: (payload: { connection: any }) => Promise<void>;
  }

  let { context, onCreate }: Props = $props();

  const normalizedSeller = $derived(
    context.seller ? (normalizeAddress(String(context.seller)) as Address) : undefined
  );

  let saving = $state(false);
  let formError = $state<string | null>(null);

  async function submit(): Promise<void> {
    formError = null;
    if (!normalizedSeller) {
      formError = 'Seller is required.';
      return;
    }
    const normalizedSellerInput = normalizeAddressInput(String(normalizedSeller));
    if (!normalizedSellerInput) {
      formError = 'Seller address is invalid.';
      return;
    }
    if (!(context.odooUrl ?? '').trim() || !(context.odooDb ?? '').trim() || !(context.odooKey ?? '').trim()) {
      formError = 'Fill all required Odoo connection fields.';
      return;
    }

    saving = true;
    try {
      await onCreate({
        connection: {
          chainId: context.chainId,
          seller: normalizedSellerInput,
          odooUrl: (context.odooUrl ?? '').trim(),
          odooDb: (context.odooDb ?? '').trim(),
          odooUid: context.odooUid ?? 0,
          odooKey: (context.odooKey ?? '').trim(),
          salePartnerId: context.salePartnerId ?? undefined,
          jsonrpcTimeoutMs: context.jsonrpcTimeoutMs ?? 30000,
          fulfillInheritRequestAbort: Boolean(context.fulfillInheritRequestAbort),
          enabled: Boolean(context.enabled),
        },
      });
    } finally {
      saving = false;
    }
  }
</script>

<AdminProductFormBase
  title=""
  showHeader={false}
  onSubmit={submit}
  loading={saving}
  submitLabel="Create connection"
>
  {#if formError}
    <p class="text-error text-sm">{formError}</p>
  {/if}

  <div class="text-sm">
    <span class="opacity-70">Seller:</span>
    <code class="ml-2 font-mono">{normalizedSeller ?? ''}</code>
  </div>

  <div class="divider text-xs">Odoo connection</div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label class="form-control">
      <span class="label-text">Odoo URL *</span>
      <input class="input input-bordered input-sm" bind:value={context.odooUrl} placeholder="https://your-odoo" />
    </label>
    <label class="form-control">
      <span class="label-text">Database *</span>
      <input class="input input-bordered input-sm" bind:value={context.odooDb} />
    </label>
    <label class="form-control">
      <span class="label-text">UID *</span>
      <input type="number" class="input input-bordered input-sm" bind:value={context.odooUid} />
    </label>
    <label class="form-control">
      <span class="label-text">API key *</span>
      <input type="password" class="input input-bordered input-sm" bind:value={context.odooKey} />
    </label>
    <label class="form-control">
      <span class="label-text">Sale partner ID</span>
      <input type="number" class="input input-bordered input-sm" bind:value={context.salePartnerId} />
    </label>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label class="form-control">
      <span class="label-text">JSON-RPC timeout (ms)</span>
      <input type="number" class="input input-bordered input-sm" bind:value={context.jsonrpcTimeoutMs} min="1000" />
    </label>
    <label class="form-control">
      <span class="label-text">Fulfill inherit request abort</span>
      <input type="checkbox" class="checkbox checkbox-sm" bind:checked={context.fulfillInheritRequestAbort} />
    </label>
    <label class="form-control">
      <span class="label-text">Connection enabled</span>
      <input type="checkbox" class="checkbox checkbox-sm" bind:checked={context.enabled} />
    </label>
  </div>
</AdminProductFormBase>
