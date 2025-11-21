import type { CirclesConfig } from '@circles-sdk/sdk';

export const chiadoConfig: { production: CirclesConfig, rings: CirclesConfig } = {
  production: {
    circlesRpcUrl: 'https://chiado-rpc.aboutcircles.com',
    pathfinderUrl: 'https://chiado-pathfinder.aboutcircles.com',
    profileServiceUrl: 'https://chiado-pathfinder.aboutcircles.com/profiles/',
    v1HubAddress: '0xdbf22d4e8962db3b2f1d9ff55be728a887e47710',
    v2HubAddress: '0xb80feeDfEce647dDc709777D5094fACD157BA001',
    migrationAddress: '0x12E815963A0b910288C7256CAD0d345c8F5db08E',
    nameRegistryAddress: '0x24b3fDCdD9fef844fB3094ef43c0A6Ac23a6dF9E',
    baseGroupMintPolicy: '0xE35c66531aF28660a1CdfA3dd0b1C1C0245D2F67',
  },
  // rings are not deployed on chiado yet
  rings: {
    circlesRpcUrl: 'https://chiado-rpc.aboutcircles.com',
    pathfinderUrl: 'https://chiado-pathfinder.aboutcircles.com',
    profileServiceUrl: 'https://chiado-pathfinder.aboutcircles.com/profiles/',
    v1HubAddress: '0xdbf22d4e8962db3b2f1d9ff55be728a887e47710',
    v2HubAddress: '0xb80feeDfEce647dDc709777D5094fACD157BA001',
    migrationAddress: '0x12E815963A0b910288C7256CAD0d345c8F5db08E',
    nameRegistryAddress: '0x24b3fDCdD9fef844fB3094ef43c0A6Ac23a6dF9E',
    baseGroupMintPolicy: '0xE35c66531aF28660a1CdfA3dd0b1C1C0245D2F67',
  }
};

export const gnosisConfig: { production: CirclesConfig, rings: CirclesConfig } = {
  production: {
    circlesRpcUrl: 'https://rpc.aboutcircles.com/',
    pathfinderUrl: 'https://pathfinder.aboutcircles.com',
    profileServiceUrl: 'https://rpc.aboutcircles.com/profiles/',
    v1HubAddress: '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543',
    v2HubAddress: '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8',
    nameRegistryAddress: '0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474',
    migrationAddress: '0xD44B8dcFBaDfC78EA64c55B705BFc68199B56376',
    baseGroupMintPolicy: '0xcCa27c26CF7BAC2a9928f42201d48220F0e3a549',
    standardTreasury: '0x08F90aB73A515308f03A718257ff9887ED330C6e',
    coreMembersGroupDeployer: '0xFEca40Eb02FB1f4F5F795fC7a03c1A27819B1Ded',
    baseGroupFactory: '0xD0B5Bd9962197BEaC4cbA24244ec3587f19Bd06d'
  },
  rings: {
    circlesRpcUrl: 'https://static.94.138.251.148.clients.your-server.de/rpc/',
    pathfinderUrl: 'https://pathfinder.aboutcircles.com',
    profileServiceUrl: 'https://static.94.138.251.148.clients.your-server.de/profiles/',
    v1HubAddress: '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543',
    v2HubAddress: '0x3D61f0A272eC69d65F5CFF097212079aaFDe8267',
    nameRegistryAddress: '0x8D1BEBbf5b8DFCef0F7E2039e4106A76Cb66f968',
    migrationAddress: '0x28141b6743c8569Ad8B20Ac09046Ba26F9Fb1c90',
    baseGroupMintPolicy: '0x79Cbc9C7077dF161b92a745345A6Ade3fC626A60',
    standardTreasury: '0x3545955Bc3900bda704261e4991f239BBd99ecE5',
    coreMembersGroupDeployer: '0x7aD59c08A065738e34f13Ac94542867528a1D328',
    baseGroupFactory: '0x452C116060cBB484eeDD70F32F08aD4F0685B5D2'
  }
};