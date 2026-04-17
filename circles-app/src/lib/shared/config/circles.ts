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
      migrationAddress: '0x12E815963A0b910288C7256CAD0d345c8F5db08E',
      // Market fields from dev
      ipfsGatewayBase: 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com',
      marketApiBase: 'https://market-api.aboutcircles.com/',
      profilePinningServiceUrl: 'https://rpc.aboutcircles.com/profiles',
      marketOperator: '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
      marketChainId: 100,
      marketChainIdHex: '0x64',
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
      migrationAddress: '0x12E815963A0b910288C7256CAD0d345c8F5db08E',
      // Market fields from dev
      ipfsGatewayBase: 'https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com',
      marketApiBase: 'https://market-api.aboutcircles.com/',
      profilePinningServiceUrl: 'https://rpc.aboutcircles.com/profiles',
      marketOperator: '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
      marketChainId: 100,
      marketChainIdHex: '0x64',
    },
  };


/** Default maximum number of transfer steps in pathfinding */
export const MAX_PATH_STEPS = 65;
