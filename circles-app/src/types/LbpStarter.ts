import type { Address } from "@circles-sdk/utils";

export interface LBPStarterInstance {
    creator: Address;
    group: Address;
    asset: Address;
    contract: Address;
    groupAmountInit: string;
    groupAmountCurrent: string;
    assetAmountInit: string;
    assetAmountCurrent: string;
    groupInitWeight: bigint;
    groupFinalWeight: bigint;
    swapFee: bigint;
    updateWeightDuration: bigint;
    lbpAddress: Address;
    status: string;
  }