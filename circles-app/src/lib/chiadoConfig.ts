import type {CirclesConfig} from "@circles-sdk/sdk";

export const chiadoConfig: CirclesConfig = {
    circlesRpcUrl: "https://chiado-rpc.aboutcircles.com",
    pathfinderUrl: "https://chiado-pathfinder.aboutcircles.com",
    v2PathfinderUrl: "https://chiado-pathfinder.aboutcircles.com/pathfinder/",
    profileServiceUrl: "https://chiado-pathfinder.aboutcircles.com/profiles/",
    // circlesRpcUrl: "http://localhost:8545",
    // pathfinderUrl: "http://localhost:8080",
    // v2PathfinderUrl: "http://localhost:8080",
    // profileServiceUrl: "http://localhost:3000",
    v1HubAddress: "0xdbf22d4e8962db3b2f1d9ff55be728a887e47710",
    v2HubAddress: "0xb80feeDfEce647dDc709777D5094fACD157BA001",
    migrationAddress: "0x12E815963A0b910288C7256CAD0d345c8F5db08E",
    nameRegistryAddress: "0x24b3fDCdD9fef844fB3094ef43c0A6Ac23a6dF9E",
    baseGroupMintPolicy: "0xE35c66531aF28660a1CdfA3dd0b1C1C0245D2F67"
};

export const gnosisConfig: CirclesConfig = {
    circlesRpcUrl: "https://rpc.helsinki.aboutcircles.com/",
    pathfinderUrl: "https://pathfinder.aboutcircles.com",
    v2PathfinderUrl: "https://static.174.163.76.144.clients.your-server.de/pathfinder/",
    v1HubAddress: "0x29b9a7fbb8995b2423a71cc17cf9810798f6c543",
    v2HubAddress: "0x3a0F7848071f067c25b0747eC5bEdc77cb3778eb",
    nameRegistryAddress: "0x6192069E85afBD09D03f7e85eB6c35982A847e16",
    migrationAddress: "0x3483cE5904413bc4Fb83DA2E43540eD769752C88",
    profileServiceUrl: "https://chiado-pathfinder.aboutcircles.com/profiles/",
    baseGroupMintPolicy: "0x48F6B0aa3Ca905C9DbE41717c7664639107257da"
}