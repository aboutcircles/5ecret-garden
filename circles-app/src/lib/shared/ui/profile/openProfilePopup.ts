import type { Address } from '@circles-sdk/utils';
import { normalizeEvmAddress } from '@circles-market/sdk';
import { popupControls } from '$lib/shared/state/popup';
import { ProfilePopup } from '$lib/areas/profile/ui/pages';

type ProfilePopupOptions = {
  title?: string;
  dismiss?: 'backdrop' | 'explicit';
  kind?: 'inspect' | 'flow' | 'confirm' | 'edit';
};

function normalizeAddress(address: Address | string): Address {
  return normalizeEvmAddress(String(address)) as Address;
}

export function openProfilePopup(address: Address | string, options: ProfilePopupOptions = {}): void {
  const normalizedAddress = normalizeAddress(address);

  popupControls.open({
    title: options.title ?? 'Profile',
    kind: options.kind ?? 'inspect',
    dismiss: options.dismiss ?? 'backdrop',
    key: `profile-${normalizedAddress.toLowerCase()}`,
    component: ProfilePopup,
    props: { address: normalizedAddress },
  });
}
