<script lang="ts">
  import { mnemonicToEntropy, validateMnemonic } from 'bip39';
  import { ethers } from 'ethers';

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
    address = $bindable(''),
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

<div class="w-full grid grid-cols-2 md:grid-cols-6 gap-x-6 gap-y-8">
  {#each boxes as box, i}
    <div class="flex items-center justify-between gap-x-1">
      <span class="text-sm font-bold w-1/6">{(i + 1).toString()}</span>
      <input
        type="password"
        class="w-full input input-bordered input-sm"
        class:text-error={!isValidMnemonic}
        class:text-success={isValidMnemonic}
        bind:value={boxes[i]}
        onchange={onInput}
        onkeyup={onInput}
      />
    </div>
  {/each}
</div>
