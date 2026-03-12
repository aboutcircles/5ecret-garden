import type { Address } from '@aboutcircles/sdk-types';

/**
 * Market-specific configuration that extends the base Circles config.
 * Kept separate since CirclesConfig from the new SDK doesn't include market fields.
 */
export type MarketConfig = {
  ipfsGatewayBase: string;
  marketApiBase: string;
  marketOperator: Address;
  marketChainId: number;
  marketChainIdHex: string;
};

export const gnosisMarketConfig: MarketConfig = {
  ipfsGatewayBase: 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com',
  marketApiBase: 'https://market-api.aboutcircles.com:18080/market/',
  marketOperator: '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
  marketChainId: 100,
  marketChainIdHex: '0x64',
};

export const chiadoMarketConfig: MarketConfig = {
  ipfsGatewayBase: 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com',
  marketApiBase: 'http://market-api.aboutcircles.com:18080/market/',
  marketOperator: '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
  marketChainId: 100,
  marketChainIdHex: '0x64',
};
