<script>
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	export let value = '';
	let svg = '';

	const generateQrCode = async () => {
		svg = await QRCode.toString(value, { type: 'svg' });
		console.log(svg);
	};

	$: if (value) {
		QRCode.toString(value, { type: 'svg' });
	}

	onMount(() => {
		generateQrCode();
	});
</script>

{@html svg}