<script lang="ts">
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { crcTypes, roundToDecimals, staticTypes } from '$lib/utils/shared';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import WrapTokens from '$lib/pages/WrapTokens.svelte';
  import MigrateTokens from '$lib/pages/MigrateTokens.svelte';
  import UnwrapTokens from '$lib/pages/UnwrapTokens.svelte';
  import RedeemGroup from '$lib/pages/RedeemGroup.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import BalanceListItem from './BalanceListItem.svelte';

  interface Props {
    balance: TokenBalanceRow;
  }

  let { balance }: Props = $props();

  const actions = [
    {
      condition: (balance: TokenBalanceRow) =>
        ['CrcV2_RegisterHuman', 'CrcV2_RegisterGroup'].includes(
          balance.tokenType
        ),
      title: 'Wrap',
      icon: '/banknotes.svg',
      component: WrapTokens,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV2_RegisterGroup',
      title: 'Redeem',
      icon: '/redeem.svg',
      component: RedeemGroup,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV1_Signup' &&
        !!avatarState.avatar?.avatarInfo &&
        avatarState.avatar?.avatarInfo?.version > 1,
      title: 'Migrate Tokens to V2',
      icon: '/banknotes.svg',
      component: MigrateTokens,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV2_ERC20WrapperDeployed_Demurraged',
      title: 'Unwrap',
      icon: '/banknotes.svg',
      component: UnwrapTokens,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV2_ERC20WrapperDeployed_Inflationary',
      title: 'Unwrap Static Circles',
      icon: '/banknotes.svg',
      component: UnwrapTokens,
    },
  ];

  const executeAction = (action: {
    condition: (balance: TokenBalanceRow) => boolean;
    title: string;
    icon: string;
    component: any;
  }) => {
    popupControls.open?.({
      title: action.title,
      component: action.component,
      props: { asset: balance },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(balance.isWrapped ? balance.tokenAddress : balance.tokenId);
  };

  // Prepare actions for the modern component
  const availableActions = actions
    .filter(action => action.condition(balance))
    .map(action => ({
      label: action.title,
      icon: action.icon,
      onClick: () => executeAction(action)
    }));

  // Add copy action
  availableActions.push({
    label: 'Copy',
    icon: '/copy.svg',
    onClick: handleCopy
  });

  // Get the display name - could be from profile or address
  const displayName = balance.tokenOwner ? 
    `${balance.tokenOwner.slice(0, 6)}...${balance.tokenOwner.slice(-4)}` : 
    'Unknown';

  // Format the amount display
  const primaryAmount = `${roundToDecimals(balance.circles)} CRC`;
  
  // Build subtitle with additional balance info
  let subtitle = tokenTypeToString(balance.tokenType);
  if (staticTypes.has(balance.tokenType)) {
    subtitle += ` • ${roundToDecimals(balance.staticCircles)} Static`;
  }
  if (crcTypes.has(balance.tokenType)) {
    subtitle += ` • ${roundToDecimals(balance.crc)} CRC`;
  }
</script>

<BalanceListItem
  name={displayName}
  subtitle={subtitle}
  amount={primaryAmount}
  currency=""
  address={balance.tokenOwner}
  showActions={!avatarState.isGroup && availableActions.length > 0}
  actions={availableActions}
  variant="balance"
/>
