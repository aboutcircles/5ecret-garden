<script lang="ts">
  import * as bip39 from 'bip39';
  import { Wallet } from 'ethers';

  let mnemonicInput: string = $state('');
  let mnemonicWordsCount: number = $state(0);
  let address: string = $state('');
  let privateKey: string = $state('');
  let entropyHex: string = $state('');
  let error: string = $state('');
  let copied: string = $state('');

  function normalizeMnemonic(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function deriveFromMnemonic(rawMnemonic: string): void {
    copied = '';
    error = '';

    const normalized = normalizeMnemonic(rawMnemonic);
    mnemonicInput = normalized;
    mnemonicWordsCount = normalized ? normalized.split(' ').length : 0;

    if (!normalized) {
      entropyHex = '';
      address = '';
      privateKey = '';
      return;
    }

    if (!bip39.validateMnemonic(normalized)) {
      entropyHex = '';
      address = '';
      privateKey = '';
      error = 'Invalid BIP39 mnemonic phrase.';
      return;
    }

    // Requested pipeline:
    // 1) mnemonic -> entropy (hex)
    // 2) entropy (hex) -> private key (0x-prefixed)
    // 3) private key -> EOA address
    entropyHex = bip39.mnemonicToEntropy(normalized);
    privateKey = `0x${entropyHex}`;

    const wallet = new Wallet(privateKey);
    address = wallet.address;
  }

  function generateMnemonic(): void {
    // Requested pipeline:
    // 1) random key bytes (32 bytes / 256-bit entropy)
    // 2) entropyToMnemonic(randomKey)
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomHex = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const generatedMnemonic = bip39.entropyToMnemonic(randomHex);

    // 3) mnemonicToEntropy(mnemonic)
    // 4) address from resulting private key
    deriveFromMnemonic(generatedMnemonic);
  }

  async function copyValue(label: string, value: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copied = `${label} copied`;
    } catch {
      copied = `${label} copy failed`;
    }
  }
</script>

<div class="page page--lg py-6">
  <h1 class="text-2xl font-semibold">Utility: BIP39 Key Helper</h1>
  <p class="mt-2 text-sm opacity-80">
    Generate a random 24-word mnemonic and derive the corresponding EOA address and hex private key.
  </p>

  <div class="alert alert-warning mt-4 text-sm">
    <span>
      Sensitive data warning: do not use generated keys with real funds unless you understand the risk.
    </span>
  </div>

  <section class="mt-5 bg-base-100 border border-base-300 rounded-xl p-4 space-y-3">
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-primary" type="button" onclick={generateMnemonic}>
        Generate random 24-word phrase
      </button>
      <button
        class="btn btn-ghost"
        type="button"
        onclick={() => deriveFromMnemonic(mnemonicInput)}
      >
        Derive from phrase
      </button>
      <button
        class="btn btn-ghost"
        type="button"
        onclick={() => {
          mnemonicInput = '';
          mnemonicWordsCount = 0;
          entropyHex = '';
          address = '';
          privateKey = '';
          error = '';
          copied = '';
        }}
      >
        Clear
      </button>
    </div>

    <label class="form-control">
      <span class="label-text">Mnemonic phrase</span>
      <textarea
        class="textarea textarea-bordered min-h-28"
        bind:value={mnemonicInput}
        oninput={(e) => deriveFromMnemonic((e.currentTarget as HTMLTextAreaElement).value)}
        placeholder="Paste or generate a 12/24 word BIP39 phrase"
      ></textarea>
    </label>

    <div class="text-xs opacity-70">Word count: {mnemonicWordsCount}</div>

    {#if error}
      <div class="alert alert-error text-sm"><span>{error}</span></div>
    {/if}

    <div class="space-y-2">
      <div>
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="text-xs uppercase opacity-60">Entropy (hex)</div>
          <button class="btn btn-xs btn-ghost" type="button" onclick={() => copyValue('Entropy', entropyHex)}>
            Copy
          </button>
        </div>
        <pre class="bg-base-200 rounded p-2 text-xs overflow-x-auto">{entropyHex || '-'}</pre>
      </div>

      <div>
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="text-xs uppercase opacity-60">EOA address</div>
          <button class="btn btn-xs btn-ghost" type="button" onclick={() => copyValue('Address', address)}>
            Copy
          </button>
        </div>
        <pre class="bg-base-200 rounded p-2 text-xs overflow-x-auto">{address || '-'}</pre>
      </div>

      <div>
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="text-xs uppercase opacity-60">Hex private key</div>
          <button
            class="btn btn-xs btn-ghost"
            type="button"
            onclick={() => copyValue('Private key', privateKey)}
          >
            Copy
          </button>
        </div>
        <pre class="bg-base-200 rounded p-2 text-xs overflow-x-auto">{privateKey || '-'}</pre>
      </div>
    </div>

    {#if copied}
      <div class="text-xs text-success">{copied}</div>
    {/if}
  </section>
</div>
