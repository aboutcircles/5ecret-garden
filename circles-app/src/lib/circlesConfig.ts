import type {CirclesConfig} from "@circles-sdk/sdk";

export const circlesConfig: CirclesConfig = {
    circlesRpcUrl: "https://chiado-rpc.aboutcircles.com",
    // circlesRpcUrl: "http://localhost:8545",
    pathfinderUrl: "https://chiado-rpc.aboutcircles.com/pathfinder",
    profileServiceUrl: "http://localhost:3000/",
    v1HubAddress: "0xdbf22d4e8962db3b2f1d9ff55be728a887e47710",
    v2HubAddress: "0x2066CDA98F98397185483aaB26A89445addD6740",
    migrationAddress: "0x2A545B54bb456A0189EbC53ed7090BfFc4a6Af94",
    nameRegistryAddress: "0x64703664BBc8A3BaeD014171e86Dfc2dF2E07A08"
};

export const gnosisConfig: CirclesConfig = {
    circlesRpcUrl: "https://rpc.helsinki.aboutcircles.com",
    pathfinderUrl: "https://pathfinder.aboutcircles.com",
    v1HubAddress: "0x29b9a7fbb8995b2423a71cc17cf9810798f6c543"
}