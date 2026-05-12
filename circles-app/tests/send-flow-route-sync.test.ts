// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import type { TokenBalance } from '@aboutcircles/sdk-types';
import AmountStep from '../src/lib/areas/wallet/flows/send/3_Amount.svelte';
import { createSendFlowContext } from '../src/lib/areas/wallet/flows/send/sendFlowContext.svelte';

describe('send flow route changes', () => {
  it('updates amount availability when selected asset changes without remount', async () => {
    const assetA = {
      tokenAddress: '0x0000000000000000000000000000000000000011',
      tokenOwner: '0x0000000000000000000000000000000000000012',
      tokenType: 'CrcV2_RegisterHuman',
      circles: 5,
      staticCircles: 0,
      isErc20: false,
      isErc1155: true,
      isWrapped: false,
      isInflationary: false,
      isGroup: false,
      tokenId: '0x0000000000000000000000000000000000000000',
      version: 2,
      attoCircles: BigInt('5000000000000000000'),
      staticAttoCircles: BigInt(0),
      attoCrc: BigInt('5000000000000000000'),
      crc: 5,
    } satisfies TokenBalance;

    const assetB = {
      tokenAddress: '0x0000000000000000000000000000000000000021',
      tokenOwner: '0x0000000000000000000000000000000000000022',
      tokenType: 'CrcV2_RegisterHuman',
      circles: 12,
      staticCircles: 0,
      isErc20: false,
      isErc1155: true,
      isWrapped: false,
      isInflationary: false,
      isGroup: false,
      tokenId: '0x0000000000000000000000000000000000000000',
      version: 2,
      attoCircles: BigInt('12000000000000000000'),
      staticAttoCircles: BigInt(0),
      attoCrc: BigInt('12000000000000000000'),
      crc: 12,
    } satisfies TokenBalance;

    const context = createSendFlowContext({
      selectedAsset: assetA,
      selectedAddress: '0x0000000000000000000000000000000000000033',
    });

    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(AmountStep, { target, props: { context } });

    expect(target.textContent).toContain('Available: 5');

    context.selectedAsset = assetB;
    await tick();

    expect(target.textContent).toContain('Available: 12');

    unmount(component);
    target.remove();
  });
});
