<script lang="ts">
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import { openFlowPopup } from '$lib/shared/state/popup';

  async function connectWallet() {
    const { default: SelectWallet } = await import('$lib/areas/wallet/ui/onboarding/SelectWallet.svelte');
    openFlowPopup({ component: SelectWallet, title: 'Select Wallet' });
  }
</script>

<div
  class="min-h-[calc(100dvh-56px)] md:min-h-dvh flex flex-col items-center justify-center text-center px-6 py-12"
  style="background:linear-gradient(160deg,#F6F5F2 0%,#FFFFFF 55%,#F4F2FE 100%);"
>
  <!-- Illustration -->
  <div class="mb-8">
    <picture>
      <source
        type="image/webp"
        srcset="/illustration-340.webp 340w, /illustration-680.webp 680w"
        sizes="(max-width: 640px) 260px, 300px"
      />
      <img
        src="/illustration-340.png"
        srcset="/illustration-340.png 340w, /illustration-680.png 680w"
        sizes="(max-width: 640px) 260px, 300px"
        alt="Circles illustration"
        width="300"
        height="300"
        class="w-[260px] md:w-[300px]"
        loading="eager"
        fetchpriority="high"
      />
    </picture>
  </div>

  <!-- Headline -->
  <h1 class="h1-display mb-4" style="color:#0F0A1E;max-width:560px;">
    Money, Reimagined
  </h1>

  <!-- Subline -->
  <p class="text-[16px] leading-relaxed mb-10 max-w-[420px]" style="color:rgba(15,10,30,0.55);">
    Mint personal Circles, build trust, and manage your community groups.
  </p>

  <ActionButton action={connectWallet}>Connect Wallet</ActionButton>

  <p class="mt-8 text-[12px]" style="color:rgba(15,10,30,0.28);">
    Circles v2 · Gnosis Chain
  </p>
</div>
