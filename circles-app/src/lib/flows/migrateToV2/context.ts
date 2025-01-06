import type {Profile} from "@circles-sdk/profiles";

export type MigrateToV2Context = {
    inviter: string | "0x0000000000000000000000000000000000000000" | undefined;
    profile: Profile | undefined;
    trustList: string[]
};