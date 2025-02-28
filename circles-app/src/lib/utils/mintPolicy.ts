type Address = `0x${string}`;

export type MintPolicy = {
    id: number;
    address: Address;
    name: string;
};

const baseGroupMintPolicy = '0xcCa27c26CF7BAC2a9928f42201d48220F0e3a549';

export const mintPolicies: MintPolicy[] = [
    {
        id: 0,
        address: baseGroupMintPolicy as Address,
        name: `Standard Mint Policy - ${baseGroupMintPolicy}`,
    },
];
