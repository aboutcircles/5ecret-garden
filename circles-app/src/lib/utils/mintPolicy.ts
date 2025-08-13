import { circlesConfig } from '$lib/stores/config.svelte';

export type MintPolicy = {
  id: number;
  address: string;
  name: string;
};

export const mintPolicies: MintPolicy[] = [
  {
    id: 0,
    address: circlesConfig.config.baseGroupMintPolicy,
    name: `Standard Mint Policy - ${circlesConfig.config.baseGroupMintPolicy}`,
  },
];
