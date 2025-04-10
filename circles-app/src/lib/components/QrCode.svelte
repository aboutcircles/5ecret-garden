<script lang="ts">
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';

  interface Props {
    value?: string;
  }

  let { value = '' }: Props = $props();
  let svg = $state('');

  const generateQrCode = async () => {
    svg = await QRCode.toString(value, { type: 'svg', width: 200 });
  };

  $effect(() => {
    if (value) {
      QRCode.toString(value, { type: 'svg' });
    }
  });

  onMount(() => {
    generateQrCode();
  });
</script>

<div class="w-[200px]">
  {@html svg}
</div>
