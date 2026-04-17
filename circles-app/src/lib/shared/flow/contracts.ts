import type { TokenBalanceRow } from '@circles-sdk/data';
import type { Profile } from '@circles-sdk/profiles';
import type { Address } from '@circles-sdk/utils';

export interface SelectTargetStepProps<
  TContext extends { selectedAddress?: Address | undefined },
> {
  context: TContext;
}

export interface SelectAssetStepProps<
  TContext extends { selectedAsset?: TokenBalanceRow | undefined },
> {
  context: TContext;
}

export interface EnterAmountStepProps<
  TContext extends {
    amount?: number | undefined;
    selectedAsset?: TokenBalanceRow | undefined;
  },
> {
  context: TContext;
}

export interface ProfileEditStepProps<
  TContext extends { profile?: Profile | undefined },
> {
  context: TContext;
}

export interface ReviewStepProps<TContext> {
  context: TContext;
}
