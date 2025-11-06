<script lang="ts">
  import { get } from 'svelte/store';
  import { popupControls } from '$lib/stores/popUp';
  import { runTask } from '$lib/utils/tasks';
  import { circles } from '$lib/stores/circles';
  import { signer, wallet } from '$lib/stores/wallet.svelte';
  import { createProfilesOffersClient } from '$lib/offers/client';
  import { computeSafeHash } from '$lib/offers/adapters';
  import type { OfferFlowContext, Address } from './types';
  import { SigningKey, Signature } from 'ethers';

  interface Props { context: OfferFlowContext; }
  let { context }: Props = $props();

  const $circles = get(circles);
  const $wallet  = get(wallet);
  const $signer  = get(signer);

  function requiredOk(): boolean {
    const d = context.draft!;
    const hasProduct = !!d.sku && !!d.name;
    const hasOffer =
      (d.price ?? 0) > 0 &&
      /^[A-Z]{3}$/.test(d.priceCurrency ?? '') &&
      isAbsUrl(d.checkout ?? '');
    return hasProduct && hasOffer;
  }

  function isAbsUrl(s?: string): boolean {
    if (!s) return false;
    try { new URL(s); return true; } catch { return false; }
  }

  // Minimal inline bindings to reuse existing client
  function mkClient() {
    if (!$circles) throw new Error('Circles SDK not initialized');
    if (!$circles.profiles) throw new Error('Profiles service not configured');
    if (!$wallet?.address) throw new Error('Wallet runner not available');

    const circlesBindings = {
      getLatestProfileCid: async (avatar: Address) =>
        (await $circles.data.getMetadataCidForAddress(avatar)) ?? null,
      getProfile: async (cid: string) => {
        try { return await $circles.profiles!.get(cid); } catch { return undefined; }
      },
      putJsonLd: async (obj: any) => {
        const cid = await $circles.profiles!.create(obj);
        if (!cid) throw new Error('Failed to pin JSON-LD');
        return cid;
      },
      updateAvatarProfileDigest: async (avatar: Address, cid: string) => {
        const av = await $circles.getAvatar(avatar);
        const tx = await av.updateMetadata(cid);
        return (tx as any)?.hash ?? undefined;
      }
    };

    async function ethSign(addr: Address, digest: `0x${string}`): Promise<`0x${string}`> {
      const eth: any = (window as any)?.ethereum;
      if (!eth?.request) throw new Error('No injected provider for eth_sign');
      return await eth.request({ method: 'eth_sign', params: [addr, digest] });
    }

    async function signDigest(d: `0x${string}`): Promise<`0x${string}`> {
      if ($signer.privateKey) {
        const key = new SigningKey($signer.privateKey as `0x${string}`);
        return Signature.from(key.sign(d)).serialized as `0x${string}`;
      }
      if (!$signer.address) throw new Error('Owner EOA address missing');
      return ethSign($signer.address as Address, d);
    }

    const isSafe = Boolean(
      $wallet.address &&
      $signer.address &&
      $wallet.address.toLowerCase() !== ($signer.address as string).toLowerCase()
    );

    const signerBindings = {
      signKeccakDigest: async (_addr: Address, digest32: `0x${string}`) => signDigest(digest32),
      signSafeHash: async (safe: Address, owner: Address, chainId: bigint, payload: Uint8Array) => {
        const digest = computeSafeHash(chainId, safe, payload);
        return signDigest(digest);
      },
      _isSafeRunner: isSafe,
      _ownerAddress: $signer.address as Address | undefined
    };

    const client = createProfilesOffersClient(
      circlesBindings as any,
      signerBindings as any
    );

    return { client, isSafe, owner: signerBindings._ownerAddress };
  }

  async function publish(): Promise<void> {
    if (!requiredOk()) throw new Error('Draft has missing or invalid fields.');
    const { client, isSafe, owner } = mkClient();
    const d = context.draft!;
    const seller = $wallet!.address as Address;

    const CHAIN_ID = 100; // GNOSIS

    await runTask({
      name: 'Publishing offer…',
      promise: (async () => {
        const res = await client.appendOffer({
          avatar: seller,
          operator: context.operator,
          chainId: CHAIN_ID,
          product: {
            sku: d.sku,
            name: d.name,
            description: d.description || undefined,
            image: d.image || undefined,
            url: d.url || undefined,
            brand: d.brand || undefined,
            mpn: d.mpn || undefined,
            gtin13: d.gtin13 || undefined,
            category: d.category || undefined,
          },
          offer: {
            price: Number(d.price),
            priceCurrency: d.priceCurrency!,
            checkout: d.checkout!,
            availability: d.availability || undefined,
            availabilityFeed: d.availabilityFeed || undefined,
            inventoryFeed: d.inventoryFeed || undefined,
            url: d.url || undefined,
            sellerName: d.sellerName || undefined,
          },
          ownerAddress: isSafe ? (owner as Address) : undefined,
        });

        context.result = res;
      })(),
    });

    popupControls.close();
  }
</script>

{#if !requiredOk()}
  <div class="alert alert-warning mb-4">Draft has missing or invalid fields.</div>
{/if}

<div class="space-y-2">
  <div class="text-sm opacity-70">Review</div>
  <div class="bg-base-100 border rounded-lg p-3">
    <div class="font-semibold truncate">{context.draft?.name} <span class="opacity-60">({context.draft?.sku})</span></div>
    {#if context.draft?.image}
      <img alt="preview" class="w-full h-40 object-cover rounded mt-2" src={context.draft?.image} />
    {/if}
    {#if context.draft?.description}
      <div class="mt-2 text-sm opacity-80">{context.draft?.description}</div>
    {/if}
    <div class="mt-3 text-sm">
      <div><strong>Price:</strong> {context.draft?.price} {context.draft?.priceCurrency}</div>
      <div class="truncate"><strong>Checkout:</strong> {context.draft?.checkout}</div>
    </div>
  </div>

  <div class="mt-4 flex justify-end gap-2">
    <button type="button" class="btn" onclick={() => history.back()}>Back</button>
    <button type="button" class="btn btn-primary" disabled={!requiredOk()} onclick={publish}>Publish</button>
  </div>
</div>
