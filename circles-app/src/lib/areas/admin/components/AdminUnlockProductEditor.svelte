<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import AdminProductFormBase from './AdminProductFormBase.svelte';
  import type { AdminProductType, AdminUnifiedProduct } from '../types';
  import type {
    UnlockKeyManagerMode,
    UnlockProductConfig,
    RouteUpsertInput,
  } from '$lib/areas/admin/services/gateway/adminClient';
  import { normalizeAddressInput, normalizeSku } from '../productEditorUtils';
  import { T } from '$lib/design-system/tokens.js';

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
    <p style="color:{T.negative};font-size:13px;">{formError}</p>
  {/if}

  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Seller address *</span>
      <input type="text" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;" bind:value={seller} placeholder="0x..." />
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">SKU *</span>
      <input type="text" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;" bind:value={sku} placeholder="ticket-vip" />
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Lock address *</span>
      <input type="text" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;" bind:value={lockAddress} placeholder="0x..." />
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">RPC URL *</span>
      <input type="text" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={rpcUrl} placeholder="https://rpc.gnosischain.com" />
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;grid-column:span 2;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Service private key *</span>
      <input type="password" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;" bind:value={servicePrivateKey} placeholder="0x..." />
    </label>
  </div>

  <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};"><span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>Ticket settings<span style="flex:1;height:1px;background:{T.hairlineSoft};"></span></div>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Timing mode</span>
      <select style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={timingMode}>
        <option value="duration">Duration seconds</option>
        <option value="expiration">Expiration unix</option>
      </select>
    </label>
    {#if timingMode === 'duration'}
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Duration seconds *</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" min="0" step="1" bind:value={durationSecondsInput} />
      </label>
    {:else}
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Expiration unix *</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" min="0" step="1" bind:value={expirationUnixInput} />
      </label>
    {/if}
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Key manager mode</span>
      <select style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={keyManagerMode}>
        <option value="buyer">buyer</option>
        <option value="service">service</option>
        <option value="fixed">fixed</option>
      </select>
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Fixed key manager</span>
      <input
        type="text"
        style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;"
        bind:value={fixedKeyManager}
        placeholder="0x..."
        disabled={keyManagerMode !== 'fixed'}
      />
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Total inventory *</span>
      <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" min="0" step="1" bind:value={totalInventoryInput} />
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Enabled</span>
      <input type="checkbox" style="width:14px;height:14px;accent-color:{T.primary};" bind:checked={unlockEnabled} />
    </label>
  </div>

  <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};"><span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>Optional<span style="flex:1;height:1px;background:{T.hairlineSoft};"></span></div>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Locksmith base</span>
      <input type="text" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={locksmithBase} placeholder="https://locksmith.unlock-protocol.com" />
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Locksmith token</span>
      <input type="password" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={locksmithToken} placeholder="optional" />
    </label>
  </div>

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
</AdminProductFormBase>