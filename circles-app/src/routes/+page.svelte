<script lang="ts">
  import { openFlowPopup } from '$lib/shared/state/popup';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  async function connectWallet() {
    const { default: SelectWallet } = await import('$lib/areas/wallet/ui/onboarding/SelectWallet.svelte');
    openFlowPopup({ component: SelectWallet, title: 'Connect a wallet' });
  }
</script>

<div
  class="min-h-[calc(100dvh-56px)] md:min-h-dvh flex flex-col items-center justify-center text-center px-6 py-12"
  style="background:linear-gradient(160deg,{T.lilacSoft} 0%,{T.surface} 50%,{T.coralSoft} 100%);position:relative;overflow:hidden;"
>
  <!-- Soft glow accent -->
  <div style="
    position:absolute;top:-200px;left:50%;transform:translateX(-50%);
    width:600px;height:600px;border-radius:50%;
    background:radial-gradient(circle,{T.butterSoft} 0%,transparent 70%);
    opacity:0.6;pointer-events:none;
  "></div>

  <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
    <!-- Logo + beta pill -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
      <img src="/logo.svg" alt="Circles" style="width:28px;height:28px;" />
      <span style="
        padding:3px 10px;border-radius:9999px;
        background:{T.ink};color:{T.butter};
        font-family:{T.fontSans};font-size:10.5px;font-weight:580;letter-spacing:0.04em;text-transform:lowercase;
      ">beta</span>
    </div>

    <!-- Illustration -->
    <div style="margin-bottom:18px;">
      <picture>
        <source
          type="image/webp"
          srcset="/illustration-340.webp 340w, /illustration-680.webp 680w"
          sizes="(max-width: 640px) 240px, 280px"
        />
        <img
          src="/illustration-340.png"
          srcset="/illustration-340.png 340w, /illustration-680.png 680w"
          sizes="(max-width: 640px) 240px, 280px"
          alt="Circles illustration"
          width="280"
          height="280"
          style="width:240px;"
          class="md:!w-[280px]"
          loading="eager"
          fetchpriority="high"
        />
      </picture>
    </div>

    <!-- Headline -->
    <h1 style="
      font-family:{T.fontDisplay};font-size:48px;letter-spacing:-0.025em;line-height:1.05;
      color:{T.ink};margin:0 0 14px;max-width:560px;font-weight:400;
    " class="md:!text-[60px]">
      Money, reimagined.
    </h1>

    <!-- Subline -->
    <p style="
      font-size:15px;line-height:1.55;color:{T.inkBody};
      margin:0 0 32px;max-width:420px;
    ">
      Mint personal Circles, build trust, and trade with the people in your community.
    </p>

    <!-- CTA -->
    <button
      type="button"
      onclick={connectWallet}
      style="
        height:52px;padding:0 28px;border-radius:9999px;border:0;cursor:pointer;
        background:{T.primary};color:#fff;
        display:inline-flex;align-items:center;gap:8px;
        font-family:{T.fontSans};font-size:15.5px;font-weight:580;letter-spacing:-0.005em;
        box-shadow:0 8px 24px rgba(88,73,212,0.35),0 1px 0 rgba(255,255,255,0.18) inset;
        transition:transform .08s,box-shadow .15s;
      "
    >
      <Icon name="sparkle" size={16} stroke="#fff" strokeWidth={2} />
      Connect wallet
    </button>

    <!-- Footer info -->
    <div style="display:flex;align-items:center;gap:6px;margin-top:24px;">
      <Icon name="info" size={12} stroke={T.inkSubtle} />
      <p style="margin:0;font-size:11.5px;color:{T.inkSubtle};">
        Circles v2 · Gnosis Chain
      </p>
    </div>
  </div>
</div>
