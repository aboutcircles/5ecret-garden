import type { TokenBalance } from '@aboutcircles/sdk-types';
import type { Profile } from '@aboutcircles/sdk-profiles';
import type { Address } from '@aboutcircles/sdk-types';

export interface SelectTargetStepProps<
  TContext extends { selectedAddress?: Address | undefined },
> {
  context: TContext;
}

export interface SelectAssetStepProps<
  TContext extends { selectedAsset?: TokenBalance | undefined },
> {
  context: TContext;
}

export interface EnterAmountStepProps<
  TContext extends {
    amount?: number | undefined;
    selectedAsset?: TokenBalance | undefined;
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
