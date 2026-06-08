<script lang="ts">
  import { mnemonicToEntropy, validateMnemonic } from 'bip39';
  import { ethers } from 'ethers';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    isValidMnemonic?: boolean;
    mnemonicPhrase?: string;
    privateKey?: string;
    address?: string;
  }

  let {
    isValidMnemonic = $bindable(false),
    mnemonicPhrase = $bindable(''),
    privateKey = $bindable(''),
    address = $bindable('')
  }: Props = $props();

  let boxes: string[] = $state(Array(24).fill(''));

  function onInput() {
    if (validateMnemonic(boxes[0].trim())) {
      boxes[0].split(' ').forEach((word, i) => {
        if (i < 24) {
          boxes[i] = word.trim();
          boxes = boxes;
        }
      });
    }
    validate();
  }

  function validate() {
    const phrase = boxes.join(' ');
    isValidMnemonic = validateMnemonic(phrase);
    if (isValidMnemonic) {
      const keyFromMnemonic = mnemonicToEntropy(phrase);
      const privateKeyWallet = new ethers.Wallet(keyFromMnemonic);
      mnemonicPhrase = phrase;
      address = privateKeyWallet.address;
      privateKey = privateKeyWallet.privateKey;
    } else {
      privateKey = '';
    }
  }
</script>

<div style="width:100%;display:grid;grid-template-columns:repeat(6,1fr);gap:24px 24px;">
  {#each boxes as box, i}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
      <span style="font-size:13px;font-weight:700;width:20px;flex-shrink:0;color:{T.inkMuted};">{(i + 1).toString()}</span>
      <input
        type="password"
        style="flex:1;min-width:0;height:28px;padding:0 6px;border:1px solid {T.hairline};border-radius:6px;background:{T.surface};color:{!isValidMnemonic ? T.negative : isValidMnemonic ? T.positive : T.ink};font-size:12px;font-family:{T.fontMono};outline:none;"
        bind:value={boxes[i]}
        onchange={onInput}
        onkeyup={onInput}
      />
    </div>
  {/each}
</div>
