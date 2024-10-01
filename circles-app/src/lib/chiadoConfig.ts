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
    circlesRpcUrl: "https://static.174.163.76.144.clients.your-server.de/rpc/",
    pathfinderUrl: "https://pathfinder.aboutcircles.com",
    v2PathfinderUrl: "https://static.174.163.76.144.clients.your-server.de/pathfinder/",
    v1HubAddress: "0x29b9a7fbb8995b2423a71cc17cf9810798f6c543",
    v2HubAddress: "0xa5c7ADAE2fd3844f12D52266Cb7926f8649869Da",
    nameRegistryAddress: "0x738fFee24770d0DE1f912adf2B48b0194780E9AD",
    migrationAddress: "0xe1dCE89512bE1AeDf94faAb7115A1Ba6AEff4201",
    profileServiceUrl: "https://static.174.163.76.144.clients.your-server.de/profiles/",
    baseGroupMintPolicy: "0x5Ea08c967C69255d82a4d26e36823a720E7D0317"
}