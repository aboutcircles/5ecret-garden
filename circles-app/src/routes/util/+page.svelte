<script lang="ts">
  import * as bip39 from 'bip39';
  import { T } from '$lib/design-system/tokens.js';
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
  <h1 style="font-size:22px;font-weight:600;margin:0;">Utility: BIP39 Key Helper</h1>
  <p style="margin-top:8px;font-size:13px;opacity:0.8;">
    Generate a random 24-word mnemonic and derive the corresponding EOA address and hex private key.
  </p>

  <div style="margin-top:16px;font-size:13px;background:{T.warningSoft};border:1px solid rgba(245,158,11,0.18);border-radius:10px;padding:10px 14px;color:{T.warning};">
    <span>
      Sensitive data warning: do not use generated keys with real funds unless you understand the risk.
    </span>
  </div>

  <section style="margin-top:20px;background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;">
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button style="height:36px;padding:0 18px;border-radius:9999px;border:0;background:{T.primary};color:#fff;cursor:pointer;font-family:{T.fontSans};font-size:13px;font-weight:580;" type="button" onclick={generateMnemonic}>
        Generate random 24-word phrase
      </button>
      <button
        style="height:36px;padding:0 18px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;"
        type="button"
        onclick={() => deriveFromMnemonic(mnemonicInput)}
      >
        Derive from phrase
      </button>
      <button
        style="height:36px;padding:0 18px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;"
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

    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Mnemonic phrase</span>
      <textarea
        style="width:100%;min-height:112px;padding:8px 12px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:13px;font-family:{T.fontSans};outline:none;box-sizing:border-box;resize:vertical;"
        bind:value={mnemonicInput}
        oninput={(e) => deriveFromMnemonic((e.currentTarget as HTMLTextAreaElement).value)}
        placeholder="Paste or generate a 12/24 word BIP39 phrase"
      ></textarea>
    </label>

    <div style="font-size:11px;opacity:0.7;">Word count: {mnemonicWordsCount}</div>

    {#if error}
      <div style="font-size:13px;color:{T.negative};background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);border-radius:10px;padding:10px 14px;"><span>{error}</span></div>
    {/if}

    <div style="display:flex;flex-direction:column;gap:8px;">
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <div style="font-size:10px;text-transform:uppercase;opacity:0.6;">Entropy (hex)</div>
          <button style="height:24px;padding:0 10px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:11px;" type="button" onclick={() => copyValue('Entropy', entropyHex)}>
            Copy
          </button>
        </div>
        <pre style="background:{T.pageDeep};border-radius:6px;padding:8px;font-size:11px;overflow-x:auto;font-family:{T.fontMono};">{entropyHex || '-'}</pre>
      </div>

      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <div style="font-size:10px;text-transform:uppercase;opacity:0.6;">EOA address</div>
          <button style="height:24px;padding:0 10px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:11px;" type="button" onclick={() => copyValue('Address', address)}>
            Copy
          </button>
        </div>
        <pre style="background:{T.pageDeep};border-radius:6px;padding:8px;font-size:11px;overflow-x:auto;font-family:{T.fontMono};">{address || '-'}</pre>
      </div>

      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <div style="font-size:10px;text-transform:uppercase;opacity:0.6;">Hex private key</div>
          <button
            style="height:24px;padding:0 10px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:11px;"
            type="button"
            onclick={() => copyValue('Private key', privateKey)}
          >
            Copy
          </button>
        </div>
        <pre style="background:{T.pageDeep};border-radius:6px;padding:8px;font-size:11px;overflow-x:auto;font-family:{T.fontMono};">{privateKey || '-'}</pre>
      </div>
    </div>

    {#if copied}
      <div style="font-size:11px;color:{T.positive};">{copied}</div>
    {/if}
  </section>
</div>
