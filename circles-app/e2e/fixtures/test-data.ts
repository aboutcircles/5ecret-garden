/**
 * Canned test data for E2E tests with mocked SDK.
 * All addresses are well-known test addresses (not real accounts).
 */

export const TEST_AVATAR_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as const;
export const TEST_CONTACT_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const;
export const TEST_GROUP_ADDRESS = '0x9876543210fedcba9876543210fedcba98765432' as const;

export const avatarInfo = {
  avatar: TEST_AVATAR_ADDRESS,
  hasV1: false,
  v1Token: null,
  name: 'Test User',
  cidV0: 'QmTest123',
  type: 'human' as const,
  isRegistered: true,
  isVerified: true,
  tokenId: TEST_AVATAR_ADDRESS,
  version: 2,
};

export const profile = {
  name: 'Test User',
  description: 'A test account for E2E testing',
  previewImageUrl: '',
  imageUrl: '',
};

export const tokenBalances = [
  {
    tokenId: TEST_AVATAR_ADDRESS,
    tokenOwner: TEST_AVATAR_ADDRESS,
    balance: '50000000000000000000', // 50 CRC
    isErc20: false,
    isErc1155: true,
    isWrapped: false,
    isInflationary: true,
    isGroup: false,
  },
];

export const trustRelations = [
  {
    subjectAvatar: TEST_AVATAR_ADDRESS,
    relation: 'trusts',
    objectAvatar: TEST_CONTACT_ADDRESS,
    expiryDate: '2030-01-01T00:00:00Z',
  },
  {
    subjectAvatar: TEST_CONTACT_ADDRESS,
    relation: 'trusts',
    objectAvatar: TEST_AVATAR_ADDRESS,
    expiryDate: '2030-01-01T00:00:00Z',
  },
];

export const transactionHistory = {
  rows: [
    {
      blockNumber: 1000000,
      timestamp: Math.floor(Date.now() / 1000) - 3600,
      transactionIndex: 0,
      logIndex: 0,
      transactionHash: '0xaaaa' + '0'.repeat(60),
      type: 'CrcV2_TransferSingle',
      from: TEST_AVATAR_ADDRESS,
      to: TEST_CONTACT_ADDRESS,
      amount: '10000000000000000000', // 10 CRC
      tokenAddress: TEST_AVATAR_ADDRESS,
    },
  ],
  hasMore: false,
};

export const contactProfiles: Record<string, typeof profile> = {
  [TEST_CONTACT_ADDRESS]: {
    name: 'Alice Contact',
    description: 'A trusted contact',
    previewImageUrl: '',
    imageUrl: '',
  },
};

export const groupInfo = {
  avatar: TEST_GROUP_ADDRESS,
  name: 'Test Group',
  type: 'group' as const,
  isRegistered: true,
  version: 2,
};
