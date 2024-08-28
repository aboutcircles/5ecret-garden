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
    v2HubAddress: "0xEddc960D3c78692BF38577054cb0a35114AE35e0",
    migrationAddress: "0x8C9BeAccb6b7DBd3AeffB5D77cab36b62Fe98882",
    nameRegistryAddress: "0x5525cbF9ad01a4E805ed1b40723D6377b336eCcf"
};

export const gnosisConfig: CirclesConfig = {
    circlesRpcUrl: "https://rpc.helsinki.aboutcircles.com",
    pathfinderUrl: "https://pathfinder.aboutcircles.com",
    v2PathfinderUrl: "http://localhost:8082",
    v1HubAddress: "0x29b9a7fbb8995b2423a71cc17cf9810798f6c543",
    v2HubAddress: "0x7bC1F123089Bc1f384b6379d0587968d1CD5830a",
    nameRegistryAddress: "0xb95ef3f3e693531d9588815bca954dc8dce30937",
    migrationAddress: "0xeaba6046103c3a2f5a681fd4323f78c647fb4292",
    profileServiceUrl: "https://chiado-pathfinder.aboutcircles.com/profiles/",
}