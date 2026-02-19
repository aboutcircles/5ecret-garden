import type { TokenBalanceRow } from '@aboutcircles/sdk-types';
import type { Profile } from '@aboutcircles/sdk-types';
import type { Address } from '@aboutcircles/sdk-types';

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
