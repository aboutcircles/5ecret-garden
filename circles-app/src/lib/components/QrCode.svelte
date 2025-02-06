<script>
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';

  export let value = '';
  let svg = '';

  const generateQrCode = async () => {
    svg = await QRCode.toString(value, { type: 'svg', width: 200 });
  };

  $: if (value) {
    QRCode.toString(value, { type: 'svg' });
  }

  onMount(() => {
    generateQrCode();
  });
</script>

<div class="w-[200px]">
  {@html svg}
</div>
