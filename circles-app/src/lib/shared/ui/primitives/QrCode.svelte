<script lang="ts">
    import QRCode from 'qrcode';

    interface Props {
        value?: string;
    }

    let {value = ''}: Props = $props();
    let svg = $state('');

    async function generateQrCode() {
        if (!value) {
            svg = '';
            return;
        }
        svg = await QRCode.toString(value, {type: 'svg', width: 200});
    }

    $effect(() => {
        void generateQrCode();
    });
</script>

<div class="w-[200px]">
    {@html svg}
</div>
