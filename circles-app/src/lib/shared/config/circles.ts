import type { CirclesConfig as BaseCirclesConfig } from '@aboutcircles/sdk-types';

/**
 * Extended config that adds app-specific fields not in the SDK type.
 */
export type CirclesConfig = BaseCirclesConfig & {
  /** V1→V2 migration contract address (for display labels in transaction history) */
  migrationAddress?: string;
  /** Market API base URL */
  marketApiBase?: string;
  /** Profile pinning service URL */
  profilePinningServiceUrl?: string;
  /** Market operator address */
  marketOperator?: string;
  marketChainId?: number;
  /** Market chain ID (hex string) */
  marketChainIdHex?: string;
  /** IPFS gateway base URL */
  ipfsGatewayBase?: string;
  // The metrics-exporter currently only serves from the staging subdomain even in prod use.
  /** CRC→EUR/xDAI pricing endpoint (metrics-exporter) */
  crcPricingApi?: string;
  /**
   * Score-groups (reputation-gated mint) backend base URL, e.g.
   * `https://host/score-groups` (no trailing slash). Serves the score + Merkle
   * proof consumed by the score-gated mint policy. Undefined → score-group
   * minting is unavailable on this network.
   */
  scoreGroupsBackendUrl?: string;
  /**
   * Score-gated group avatar address (the reputation group users mint against).
   * Undefined → score-group minting is unavailable on this network.
   */
  scoreGatedGroupAddress?: string;
  /**
   * Migration sink contract that legacy-group CRC is routed through when
   * migrating into the score group. Used only for display: a transaction whose
   * counterparty resolves to this sink is a group migration, so the history row
   * can label it as such and show the destination group instead of the faceless,
   * profile-less sink. Undefined → no migration labeling on this network.
   */
  scoreGroupMigrationSink?: string;
  /**
   * MultiAffiliateGroupRegistry (GA 2.0 communities) — the per-avatar registry of
   * community (affiliate group) join intents, read by the Communities tab and
   * written by its join/leave actions. Same address on every Gnosis-mainnet
   * deployment (staging and production read the same chain). Undefined → community
   * join/leave is unavailable on this network.
   */
  multiAffiliateGroupRegistry?: string;
};

export const chiadoConfig: { production: CirclesConfig; rings: CirclesConfig } =
  {
    production: {
      circlesRpcUrl: 'https://chiado-rpc.aboutcircles.com',
      chainRpcUrl: 'https://chiado-rpc.aboutcircles.com/chain-rpc',
      pathfinderUrl: 'https://chiado-pathfinder.aboutcircles.com',
      profileServiceUrl: 'https://chiado-pathfinder.aboutcircles.com/profiles/',
      v1HubAddress: '0xdbf22d4e8962db3b2f1d9ff55be728a887e47710',
      v2HubAddress: '0xb80feeDfEce647dDc709777D5094fACD157BA001',
      nameRegistryAddress: '0x24b3fDCdD9fef844fB3094ef43c0A6Ac23a6dF9E',
      baseGroupMintPolicy: '0xE35c66531aF28660a1CdfA3dd0b1C1C0245D2F67',
      standardTreasury: '0x0000000000000000000000000000000000000000',
      coreMembersGroupDeployer: '0x0000000000000000000000000000000000000000',
      baseGroupFactoryAddress: '0x0000000000000000000000000000000000000000',
      liftERC20Address: '0x0000000000000000000000000000000000000000',
      invitationModuleAddress: '0x0000000000000000000000000000000000000000',
      invitationFarmAddress: '0x0000000000000000000000000000000000000000',
      referralsModuleAddress: '0x0000000000000000000000000000000000000000',
      referralsServiceUrl: 'https://referrals.aboutcircles.com',
      migrationAddress: '0xD44B8dcFBaDfC78EA64c55B705BFc68199B56376',
      ipfsGatewayBase: 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com',
      marketApiBase: 'https://market-api.aboutcircles.com/',
      profilePinningServiceUrl: 'https://rpc.aboutcircles.com/profiles',
      marketOperator: '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
      marketChainId: 100,
      marketChainIdHex: '0x64',
      crcPricingApi:
        import.meta.env.VITE_CRC_PRICING_API ||
        'https://rpc.staging.aboutcircles.com/metrics-api/pricing',
    },
    // rings are not deployed on chiado yet
    rings: {
      circlesRpcUrl: 'https://chiado-rpc.aboutcircles.com',
      chainRpcUrl: 'https://chiado-rpc.aboutcircles.com/chain-rpc',
      pathfinderUrl: 'https://chiado-pathfinder.aboutcircles.com',
      profileServiceUrl: 'https://chiado-pathfinder.aboutcircles.com/profiles/',
      v1HubAddress: '0xdbf22d4e8962db3b2f1d9ff55be728a887e47710',
      v2HubAddress: '0xb80feeDfEce647dDc709777D5094fACD157BA001',
      nameRegistryAddress: '0x24b3fDCdD9fef844fB3094ef43c0A6Ac23a6dF9E',
      baseGroupMintPolicy: '0xE35c66531aF28660a1CdfA3dd0b1C1C0245D2F67',
      standardTreasury: '0x0000000000000000000000000000000000000000',
      coreMembersGroupDeployer: '0x0000000000000000000000000000000000000000',
      baseGroupFactoryAddress: '0x0000000000000000000000000000000000000000',
      liftERC20Address: '0x0000000000000000000000000000000000000000',
      invitationModuleAddress: '0x0000000000000000000000000000000000000000',
      invitationFarmAddress: '0x0000000000000000000000000000000000000000',
      referralsModuleAddress: '0x0000000000000000000000000000000000000000',
      referralsServiceUrl: 'https://referrals.aboutcircles.com',
      migrationAddress: '0x28141b6743c8569Ad8B20Ac09046Ba26F9Fb1c90',
      ipfsGatewayBase: 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com',
      marketApiBase: 'https://market-api.aboutcircles.com/',
      profilePinningServiceUrl: 'https://rpc.aboutcircles.com/profiles',
      marketOperator: '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
      marketChainId: 100,
      marketChainIdHex: '0x64',
      crcPricingApi:
        import.meta.env.VITE_CRC_PRICING_API ||
        'https://rpc.staging.aboutcircles.com/metrics-api/pricing',
    },
  };

export const gnosisConfig: { production: CirclesConfig; rings: CirclesConfig } =
  {
    production: {
      circlesRpcUrl:
        import.meta.env.VITE_CIRCLES_RPC_URL ||
        'https://rpc.aboutcircles.com/',
      chainRpcUrl:
        import.meta.env.VITE_CHAIN_RPC_URL || 'https://rpc.aboutcircles.com/',
      pathfinderUrl: 'https://pathfinder.aboutcircles.com',
      profileServiceUrl: 'https://rpc.aboutcircles.com/profiles/',
      v1HubAddress: '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543',
      v2HubAddress: '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8',
      nameRegistryAddress: '0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474',
      baseGroupMintPolicy: '0xcCa27c26CF7BAC2a9928f42201d48220F0e3a549',
      standardTreasury: '0x08F90aB73A515308f03A718257ff9887ED330C6e',
      coreMembersGroupDeployer: '0xFEca40Eb02FB1f4F5F795fC7a03c1A27819B1Ded',
      baseGroupFactoryAddress: '0xD0B5Bd9962197BEaC4cbA24244ec3587f19Bd06d',
      liftERC20Address: '0x5F99a795dD2743C36D63511f0D4bc667e6d3cDB5',
      invitationModuleAddress: '0x00738aca013B7B2e6cfE1690F0021C3182Fa40B5',
      invitationFarmAddress: '0xd28b7C4f148B1F1E190840A1f7A796C5525D8902',
      referralsModuleAddress: '0x12105a9B291aF2ABb0591001155A75949b062CE5',
      referralsServiceUrl: 'https://referrals.aboutcircles.com',
      migrationAddress: '0xD44B8dcFBaDfC78EA64c55B705BFc68199B56376',
      // Market fields from dev
      ipfsGatewayBase: 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com',
      marketApiBase: 'https://market-api.aboutcircles.com/',
      profilePinningServiceUrl: 'https://rpc.aboutcircles.com/profiles',
      marketOperator: '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
      marketChainId: 100,
      marketChainIdHex: '0x64',
      crcPricingApi:
        import.meta.env.VITE_CRC_PRICING_API ||
        'https://rpc.staging.aboutcircles.com/metrics-api/pricing',
      // Score-groups (reputation-gated mint): the score group avatar and its
      // proof backend — both public Gnosis-mainnet endpoints. The mint policy
      // and treasury are resolved on-chain from the Hub above, and the migration
      // pathfinder uses circlesRpcUrl, so no extra env wiring is needed.
      scoreGroupsBackendUrl: 'https://rpc.aboutcircles.com/score-groups',
      scoreGatedGroupAddress: '0x93eD5A96347927ff6fF6b790F8Cf5258240c321f',
      scoreGroupMigrationSink: '0xD4cF9afd3aE777C24454b70dd28E32d1bd516F05',
      // MultiAffiliateGroupRegistry (GA 2.0 communities) — Gnosis mainnet. Reads
      // need the staging indexer until the RPC methods are promoted to prod; the
      // on-chain join/leave writes work against this address on either server.
      multiAffiliateGroupRegistry: '0x4a25a7cf216351963f1637ad965d77b3ae277ef3',
    },
    rings: {
      circlesRpcUrl:
        'https://static.94.138.251.148.clients.your-server.de/rpc/',
      chainRpcUrl:
        'https://static.94.138.251.148.clients.your-server.de/chain-rpc/',
      pathfinderUrl: 'https://pathfinder.aboutcircles.com',
      profileServiceUrl:
        'https://static.94.138.251.148.clients.your-server.de/profiles/',
      v1HubAddress: '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543',
      v2HubAddress: '0x3D61f0A272eC69d65F5CFF097212079aaFDe8267',
      nameRegistryAddress: '0x8D1BEBbf5b8DFCef0F7E2039e4106A76Cb66f968',
      baseGroupMintPolicy: '0x79Cbc9C7077dF161b92a745345A6Ade3fC626A60',
      standardTreasury: '0x3545955Bc3900bda704261e4991f239BBd99ecE5',
      coreMembersGroupDeployer: '0x7aD59c08A065738e34f13Ac94542867528a1D328',
      baseGroupFactoryAddress: '0x0000000000000000000000000000000000000000',
      liftERC20Address: '0x0000000000000000000000000000000000000000',
      invitationModuleAddress: '0x0000000000000000000000000000000000000000',
      invitationFarmAddress: '0x0000000000000000000000000000000000000000',
      referralsModuleAddress: '0x0000000000000000000000000000000000000000',
      referralsServiceUrl: 'https://referrals.aboutcircles.com',
      migrationAddress: '0x28141b6743c8569Ad8B20Ac09046Ba26F9Fb1c90',
      // Market fields from dev
      ipfsGatewayBase: 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com',
      marketApiBase: 'https://market-api.aboutcircles.com/',
      profilePinningServiceUrl: 'https://rpc.aboutcircles.com/profiles',
      marketOperator: '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
      marketChainId: 100,
      marketChainIdHex: '0x64',
      crcPricingApi:
        import.meta.env.VITE_CRC_PRICING_API ||
        'https://rpc.staging.aboutcircles.com/metrics-api/pricing',
    },
  };


/** Default maximum number of transfer steps in pathfinding */
export const MAX_PATH_STEPS = 250;
