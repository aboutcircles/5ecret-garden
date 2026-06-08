<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import AdminProductFormBase from './AdminProductFormBase.svelte';
  import type { AdminProductType, AdminUnifiedProduct } from '../types';
  import type {
    UnlockKeyManagerMode,
    UnlockProductConfig,
    RouteUpsertInput,
  } from '$lib/areas/admin/services/gateway/adminClient';
  import { normalizeAddressInput, normalizeSku } from '../productEditorUtils';

  interface Props {
    product?: AdminUnifiedProduct | null;
    connection?: unknown;
    connections?: unknown[];
    mode?: 'product' | 'connection';
    onSubmit: (payload: {
      type: AdminProductType;
      route?: RouteUpsertInput;
      unlock?: UnlockProductConfig;
    }) => Promise<void>;
    onDisable?: () => Promise<void>;
    onCancel?: () => void;
  }

  let {
    product = null,
    connection = null,
    connections = [],
    mode = 'product',
    onSubmit,
    onDisable,
    onCancel,
  }: Props = $props();

  const chainId = 100;
  let seller: string = $state(product?.seller ?? '');
  let sku: string = $state(product?.sku ?? '');
  let lockAddress: string = $state(product?.unlock?.lockAddress ?? '');
  let rpcUrl: string = $state(product?.unlock?.rpcUrl ?? '');
  let servicePrivateKey: string = $state('');
  let keyManagerMode: UnlockKeyManagerMode = $state(product?.unlock?.keyManagerMode ?? 'buyer');
  let fixedKeyManager: string = $state(product?.unlock?.fixedKeyManager ?? '');
  let locksmithBase: string = $state(product?.unlock?.locksmithBase ?? 'https://locksmith.unlock-protocol.com');
  let locksmithToken: string = $state('');
  let totalInventoryInput: string = $state(String(product?.unlock?.totalInventory ?? 0));
  let timingMode: 'duration' | 'expiration' = $state(product?.unlock?.expirationUnix ? 'expiration' : 'duration');
  let durationSecondsInput: string = $state(String(product?.unlock?.durationSeconds ?? 86400));
  let expirationUnixInput: string = $state(String(product?.unlock?.expirationUnix ?? ''));
  let unlockEnabled: boolean = $state(product?.unlock?.enabled ?? true);

  let saving = $state(false);
  let formError: string | null = $state(null);

  function parseNonNegativeInt(input: string, fieldName: string): number | null {
    const value = Number(input);
    if (!Number.isInteger(value) || value < 0) {
      formError = `${fieldName} must be a whole number greater than or equal to 0.`;
      return null;
    }
    return value;
  }

  async function submit(): Promise<void> {
    saving = true;
    formError = null;
    try {
      const normalizedSeller = normalizeAddressInput(seller);
      const normalizedSku = normalizeSku(sku);
      const normalizedLockAddress = normalizeAddressInput(lockAddress);
      if (!normalizedSeller || !normalizedSku || !normalizedLockAddress) {
        formError = 'Please provide a valid seller, SKU, and lock address.';
        return;
      }
      if (!rpcUrl.trim()) {
        formError = 'RPC URL is required.';
        return;
      }
      if (!servicePrivateKey.trim()) {
        formError = 'Service private key is required.';
        return;
      }

      let durationSeconds: number | undefined;
      let expirationUnix: number | undefined;
      if (timingMode === 'duration') {
        const parsedDuration = parseNonNegativeInt(durationSecondsInput, 'Duration seconds');
        if (parsedDuration == null) return;
        durationSeconds = parsedDuration;
      } else {
        const parsedExpiration = parseNonNegativeInt(expirationUnixInput, 'Expiration unix');
        if (parsedExpiration == null) return;
        expirationUnix = parsedExpiration;
      }

      let normalizedFixedKeyManager: Address | null | undefined;
      if (keyManagerMode === 'fixed') {
        normalizedFixedKeyManager = normalizeAddressInput(fixedKeyManager);
        if (!normalizedFixedKeyManager) {
          formError = 'Fixed key manager address is required when key manager mode is fixed.';
          return;
        }
      }

      const totalInventory = parseNonNegativeInt(totalInventoryInput, 'Total inventory');
      if (totalInventory == null) return;

      const unlock: UnlockProductConfig = {
        chainId,
        seller: normalizedSeller,
        sku: normalizedSku,
        lockAddress: normalizedLockAddress,
        rpcUrl: rpcUrl.trim(),
        servicePrivateKey: servicePrivateKey.trim(),
        durationSeconds,
        expirationUnix,
        keyManagerMode,
        fixedKeyManager: normalizedFixedKeyManager ?? undefined,
        locksmithBase: locksmithBase.trim() || undefined,
        locksmithToken: locksmithToken.trim() || undefined,
        totalInventory,
        enabled: unlockEnabled,
      };

      await onSubmit({ type: 'unlock', unlock });
    } catch (error) {
      formError = error instanceof Error ? error.message : String(error);
    } finally {
      saving = false;
    }
  }
</script>

<AdminProductFormBase
  title={product ? 'Edit Unlock product' : 'Create Unlock product'}
  subtitle="Configure the Unlock adapter; routes are handled automatically."
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
      <input type="text" class="input input-bordered input-sm font-mono" bind:value={seller} placeholder="0x..." />
    </label>
    <label class="form-control">
      <span class="label-text">SKU *</span>
      <input type="text" class="input input-bordered input-sm font-mono" bind:value={sku} placeholder="ticket-vip" />
    </label>
    <label class="form-control">
      <span class="label-text">Lock address *</span>
      <input type="text" class="input input-bordered input-sm font-mono" bind:value={lockAddress} placeholder="0x..." />
    </label>
    <label class="form-control">
      <span class="label-text">RPC URL *</span>
      <input type="text" class="input input-bordered input-sm" bind:value={rpcUrl} placeholder="https://rpc.gnosischain.com" />
    </label>
    <label class="form-control md:col-span-2">
      <span class="label-text">Service private key *</span>
      <input type="password" class="input input-bordered input-sm font-mono" bind:value={servicePrivateKey} placeholder="0x..." />
    </label>
  </div>

  <div class="divider text-xs">Ticket settings</div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label class="form-control">
      <span class="label-text">Timing mode</span>
      <select class="select select-bordered select-sm" bind:value={timingMode}>
        <option value="duration">Duration seconds</option>
        <option value="expiration">Expiration unix</option>
      </select>
    </label>
    {#if timingMode === 'duration'}
      <label class="form-control">
        <span class="label-text">Duration seconds *</span>
        <input type="number" class="input input-bordered input-sm" min="0" step="1" bind:value={durationSecondsInput} />
      </label>
    {:else}
      <label class="form-control">
        <span class="label-text">Expiration unix *</span>
        <input type="number" class="input input-bordered input-sm" min="0" step="1" bind:value={expirationUnixInput} />
      </label>
    {/if}
    <label class="form-control">
      <span class="label-text">Key manager mode</span>
      <select class="select select-bordered select-sm" bind:value={keyManagerMode}>
        <option value="buyer">buyer</option>
        <option value="service">service</option>
        <option value="fixed">fixed</option>
      </select>
    </label>
    <label class="form-control">
      <span class="label-text">Fixed key manager</span>
      <input
        type="text"
        class="input input-bordered input-sm font-mono"
        bind:value={fixedKeyManager}
        placeholder="0x..."
        disabled={keyManagerMode !== 'fixed'}
      />
    </label>
    <label class="form-control">
      <span class="label-text">Total inventory *</span>
      <input type="number" class="input input-bordered input-sm" min="0" step="1" bind:value={totalInventoryInput} />
    </label>
    <label class="form-control">
      <span class="label-text">Enabled</span>
      <input type="checkbox" class="checkbox checkbox-sm" bind:checked={unlockEnabled} />
    </label>
  </div>

  <div class="divider text-xs">Optional</div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label class="form-control">
      <span class="label-text">Locksmith base</span>
      <input type="text" class="input input-bordered input-sm" bind:value={locksmithBase} placeholder="https://locksmith.unlock-protocol.com" />
    </label>
    <label class="form-control">
      <span class="label-text">Locksmith token</span>
      <input type="password" class="input input-bordered input-sm" bind:value={locksmithToken} placeholder="optional" />
    </label>
  </div>

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
</AdminProductFormBase>
