export type WalletState =
  | 'personV2'
  | 'organization'
  | 'newUser'
  | 'groupOwner'
  | 'personV1';

export interface TestWallet {
  address: string;
  privateKey: string;
  label: string;
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`[playwright] Missing environment variable ${name}.`);
    return '';
  }
  return value;
}

export const testWallets: Record<WalletState, TestWallet> = {
  personV2: {
    address: readEnv('TEST_WALLET_1_ADDRESS'),
    privateKey: readEnv('TEST_WALLET_1_KEY'),
    label: 'Person V2',
  },
  organization: {
    address: readEnv('TEST_WALLET_2_ADDRESS'),
    privateKey: readEnv('TEST_WALLET_2_KEY'),
    label: 'Organization',
  },
  newUser: {
    address: readEnv('TEST_WALLET_3_ADDRESS'),
    privateKey: readEnv('TEST_WALLET_3_KEY'),
    label: 'New User',
  },
  groupOwner: {
    address: readEnv('TEST_WALLET_4_ADDRESS'),
    privateKey: readEnv('TEST_WALLET_4_KEY'),
    label: 'Group Owner',
  },
  personV1: {
    address: readEnv('TEST_WALLET_5_ADDRESS'),
    privateKey: readEnv('TEST_WALLET_5_KEY'),
    label: 'Person V1',
  },
};

export const testGroupAddress = readEnv('TEST_GROUP_ADDRESS');
